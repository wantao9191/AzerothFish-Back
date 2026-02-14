import { NextRequest } from "next/server";
import { success, error as errorResponse, ResultCode } from "@/lib/response";
import { ImageToPostWorkflow } from "@/ai/workflow/image-to-post.workflow";
import { Skills } from "@/ai/skill-engine/registry";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSchema } from "@/schema/schema";

/**
 * @description 生成文章（支持流式输出）
 * @param request
 * @returns {Promise<Response>}
 */
export async function POST(request: NextRequest) {
    try {
        const openid = request.headers.get("x-user-openid");
        if (!openid) {
            return errorResponse("用户未登录", ResultCode.UNAUTHORIZED, 401);
        }
        const user = await db.query.users.findFirst({
            where: eq(users.openid, openid),
        });
        if (!user) {
            return errorResponse("用户不存在", ResultCode.UNAUTHORIZED, 401);
        }

        const body = await request.json();
        const parseResult = generateSchema.safeParse(body);
        console.log(parseResult);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues[0].message;
            console.error(errorMessage);
            return errorResponse(errorMessage, ResultCode.BAD_REQUEST, 400);
        }

        const { imageUrls, subject, level, format, detail_level, max_length, enable_review, enable_rewrite } = parseResult.data;

        // 检查是否启用流式模式（通过 header 控制）
        const enableStream = request.headers.get("x-enable-stream") === "true";

        const workflow = new ImageToPostWorkflow(
            Skills.imageParse,
            Skills.copyRewrite
        );

        // ========== 流式模式 ==========
        if (enableStream) {
            const encoder = new TextEncoder();
            const stream = new TransformStream();
            const writer = stream.writable.getWriter();

            // 异步执行 workflow，通过回调推送进度
            (async () => {
                try {
                    await workflow.run(
                        { imageUrls, subject, level, format, detail_level, max_length, enable_review, enable_rewrite },
                        async (event) => {
                            try {
                                // 清理和验证事件数据，防止循环引用
                                const cleanEvent = {
                                    type: event.type,
                                    step: event.step,
                                    ...(event.error && { error: String(event.error) }),
                                    ...(event.data && {
                                        data: JSON.parse(JSON.stringify(event.data, (key, value) => {
                                            // 过滤掉不可序列化的值
                                            if (value === undefined || value === null) return undefined;
                                            if (typeof value === 'number' && !isFinite(value)) return 0;
                                            if (typeof value === 'object' && Object.keys(value).length === 0) return undefined;
                                            return value;
                                        }))
                                    })
                                };

                                // 将进度事件编码为 SSE 格式
                                const data = `data: ${JSON.stringify(cleanEvent)}\n\n`;
                                await writer.write(encoder.encode(data));
                            } catch (serializeError: any) {
                                console.error("序列化错误:", serializeError);
                                // 发送简化的事件
                                const fallbackData = `data: ${JSON.stringify({
                                    type: event.type,
                                    step: event.step
                                })}\n\n`;
                                await writer.write(encoder.encode(fallbackData));
                            }
                        }
                    );
                    await writer.close();
                } catch (error: any) {
                    console.error("Workflow error:", error);
                    const errorData = `data: ${JSON.stringify({ 
                        type: 'error', 
                        error: error.message || '处理失败' 
                    })}\n\n`;
                    await writer.write(encoder.encode(errorData));
                    await writer.close();
                }
            })();

            return new Response(stream.readable, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // ========== 非流式模式（向后兼容） ==========
        const result = await workflow.run({ imageUrls, subject, level, format, detail_level, max_length, enable_review, enable_rewrite });
        
        // 检查是否需要直接返回文件下载（通过 header 控制）
        const returnFile = request.headers.get("x-return-file") === "true";
        
        if (returnFile && result.articles.length > 0) {
            // 导入文档生成器
            const { DocumentGenerator } = await import("@/lib/document-generator");
            
            // 生成文档文件（直接从纯文本内容生成）
            const article = result.articles[0];
            const buffer = await DocumentGenerator.generateFromText(article.content, format);
            
            // 返回文件
            const contentType = getFileContentType(format);
            const filename = getFileFilename(format);
            
            return new Response(new Uint8Array(buffer), {
                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                    'Content-Length': buffer.length.toString(),
                    'X-Review': encodeURIComponent(article.review || ""), // 点评放在 header 中
                },
            });
        }
        
        // 返回 JSON 格式（默认）
        return success(result);

    } catch (error) {
        console.error(error);
        return errorResponse("生成文章失败", ResultCode.ERROR, 500);
    }
}

/**
 * 获取文件的 Content-Type
 */
function getFileContentType(format: string): string {
    switch (format.toLowerCase()) {
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'pdf':
            return 'application/pdf';
        case 'html':
            return 'text/html; charset=utf-8';
        case 'txt':
            return 'text/plain; charset=utf-8';
        case 'markdown':
            return 'text/markdown; charset=utf-8';
        default:
            return 'application/octet-stream';
    }
}

/**
 * 获取文件名
 */
function getFileFilename(format: string): string {
    const timestamp = new Date().getTime();
    switch (format.toLowerCase()) {
        case 'docx':
            return `essay_${timestamp}.docx`;
        case 'pdf':
            return `essay_${timestamp}.pdf`;
        case 'html':
            return `essay_${timestamp}.html`;
        case 'txt':
            return `essay_${timestamp}.txt`;
        case 'markdown':
            return `essay_${timestamp}.md`;
        default:
            return `essay_${timestamp}`;
    }
}