import { db } from "@/db";
import { readingProgress, books } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { success, error as errorResponse, ResultCode } from "@/lib/response";

/**
 * @description 获取阅读进度
 * @param request
 * @param {params} { params: { id: string } }
 * @returns {Promise<Response>}
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return errorResponse("用户OpenID缺失", ResultCode.UNAUTHORIZED, 401);
    }
    const bookId = parseInt(params.id);

    if (isNaN(bookId)) {
      return errorResponse("无效的书籍ID", ResultCode.BAD_REQUEST, 400);
    }

    const progress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.openid, openid),
        eq(readingProgress.bookId, bookId)
      ),
    });

    return success(progress || null); // Return null if no progress found (not started yet)
  } catch (err) {
    console.error("Get progress error:", err);
    return errorResponse("获取阅读进度失败", ResultCode.ERROR, 500);
  }
}

/**
 * @description 更新阅读进度
 * @param request
 * @param {params} { params: { id: string } }
 * @returns {Promise<Response>}
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const openid = request.headers.get("x-user-openid");
    if (!openid) {
      return errorResponse("用户OpenID缺失", ResultCode.UNAUTHORIZED, 401);
    }
    const bookId = parseInt(params.id);

    if (isNaN(bookId)) {
      return errorResponse("无效的书籍ID", ResultCode.BAD_REQUEST, 400);
    }

    const { currentChapterId, progress } = await request.json();

    if (!currentChapterId) {
      return errorResponse("currentChapterId is required", ResultCode.BAD_REQUEST, 400);
    }

    // Ensure book belongs to user (optional strictly speaking if we trust progress, but good for security)
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.user_openid, openid)),
    });
    if (!book) {
      return errorResponse("书籍不存在", ResultCode.NOT_FOUND, 404);
    }

    // Upsert progress
    // Check if exists
    const existingProgress = await db.query.readingProgress.findFirst({
      where: and(
        eq(readingProgress.openid, openid),
        eq(readingProgress.bookId, bookId)
      ),
    });

    let result;
    if (existingProgress) {
      [result] = await db
        .update(readingProgress)
        .set({
          currentChapterId,
          progress: progress || 0,
          lastReadAt: new Date(),
        })
        .where(eq(readingProgress.id, existingProgress.id))
        .returning();
    } else {
      [result] = await db
        .insert(readingProgress)
        .values({
          openid,
          bookId,
          currentChapterId,
          progress: progress || 0,
        })
        .returning();
    }

    return success(result);
  } catch (err) {
    console.error("Update progress error:", err);
    return errorResponse("Internal server error", ResultCode.ERROR, 500);
  }
}
