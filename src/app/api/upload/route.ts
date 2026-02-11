import { db } from "@/db";
import { books, chapters, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error as errorResponse, ResultCode } from "@/lib/response";
import iconv from "iconv-lite";
import jschardet from "jschardet";
import { Readable } from "stream";
import readline from "readline";
/**
 * @description 上传书籍
 * @param request
 * @returns {Promise<Response>}
 */
export async function POST(request: Request) {
  try {
    // 1. 鉴权
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return errorResponse("User context (openid) missing", ResultCode.UNAUTHORIZED, 401);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.openid, openid),
    });

    if (!user) {
      return errorResponse("用户不存在", ResultCode.UNAUTHORIZED, 401);
    }

    // 2. 获取参数
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return errorResponse("无效的JSON格式或空体", ResultCode.BAD_REQUEST, 400);
    }

    const { fileUrl, fileName, fileSize } = body;

    if (!fileUrl || !fileName) {
      return errorResponse("缺少文件URL或文件名", ResultCode.BAD_REQUEST, 400);
    }

    // 3. 获取下载流 (不直接 buffer 整个文件)
    console.log(`Streaming file from: ${fileUrl}`);
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok || !fileResponse.body) {
      console.error(`Fetch failed: ${fileResponse.status} ${fileResponse.statusText}`);
      return errorResponse("获取文件流失败", ResultCode.ERROR, 500);
    }

    // 4. 准备流式解析
    // 获取 Web ReadableStream 的 reader
    const reader = fileResponse.body.getReader();

    // A. 读取第一个数据块 (First Chunk) 用于检测编码
    const { value: firstChunk, done: firstDone } = await reader.read();

    if (firstDone) {
      return errorResponse("文件为空", ResultCode.BAD_REQUEST, 400);
    }

    // B. 检测编码
    // jschardet 需要 Buffer，Uint8Array 可以直接转换
    const sampleBuffer = Buffer.from(firstChunk);
    const detected = jschardet.detect(sampleBuffer);
    let encoding = detected.encoding || 'UTF-8';

    // 编码修正 (GBK 系列统统用 GB18030)
    if (['GB2312', 'GBK'].includes(encoding.toUpperCase())) {
      encoding = 'GB18030';
    }
    console.log(`Detected encoding: ${detected.encoding}, using: ${encoding}`);

    // C. 构造组合流：(First Chunk) + (Remaining Stream)
    // 使用异步生成器来创建一个新的 Node.js Readable Stream
    const streamIterator = async function* () {
      yield firstChunk; // 先吐出第一个块
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    };
    const nodeStream = Readable.from(streamIterator());

    // D. 建立管道：Stream -> Decoder -> Readline
    const decodedStream = nodeStream.pipe(iconv.decodeStream(encoding));
    const rl = readline.createInterface({
      input: decodedStream,
      crlfDelay: Infinity
    });

    // 5. 逐行解析 (流式)
    // 只要内存够存解析后的结构即可，不再持有原始文件内容
    const parsedChapters: { title: string; content: string }[] = [];

    let currentTitle = "序章/前言";
    let currentLines: string[] = [];

    const chapterPattern = /^\s*(第[0-9一二三四五六七八九十百千]+[章回节]|Chapter\s+\d+)/;

    // for await...of 循环处理每一行
    for await (const line of rl) {
      if (chapterPattern.test(line)) {
        // 遇到新章节，保存上一章
        if (currentLines.length > 0) {
          parsedChapters.push({
            title: currentTitle,
            content: currentLines.join('\n')
          });
        }
        // 重置状态
        currentTitle = line.trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    // 保存最后一章
    if (currentLines.length > 0) {
      parsedChapters.push({
        title: currentTitle,
        content: currentLines.join('\n')
      });
    }

    // 6. 数据库事务
    const result = await db.transaction(async (tx) => {
      // A. 保存 Book
      const [newBook] = await tx.insert(books).values({
        user_openid: openid,
        title: fileName.replace(/\.[^/.]+$/, ""),
        fileUrl: fileUrl.split('?')[0],
        format: fileName.split('.').pop()?.toLowerCase() || 'txt',
        size: fileSize || 0, // 无法从 buffer 获取长度了，依赖前端传值
        author: "Unknown",
      }).returning();

      // B. 批量保存 Chapter
      if (parsedChapters.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < parsedChapters.length; i += batchSize) {
          const batch = parsedChapters.slice(i, i + batchSize).map((chap, idx) => ({
            bookId: newBook.id,
            title: chap.title,
            content: chap.content,
            orderIndex: i + idx + 1,
            wordCount: chap.content.length,
          }));
          await tx.insert(chapters).values(batch);
        }
      } else {
        // 无章节情况（虽然流式读取后 lines 会 join 起来）
        // 如果 parsedChapters 为空，说明没有匹配到任何章标题，
        // 此时 currentLines 里存的是全文（序章），但循环结束后已经 push 到 parsedChapters 了
        // 除非文件是空的
        // 如果真的只有一个序章，parsedChapters 长度为 1
        // 这里做一个兜底，以防万一逻辑有漏
        if (parsedChapters.length === 0 && currentLines.length > 0) {
          // 实际上上面的逻辑会保证最后一章被 push，除非文件全空
        }
      }
      return newBook;
    });

    return success({
      book: result,
      chapterCount: parsedChapters.length
    });

  } catch (err) {
    console.error("Upload callback error:", err);
    return errorResponse("上传书籍失败", ResultCode.ERROR, 500);
  }
}
