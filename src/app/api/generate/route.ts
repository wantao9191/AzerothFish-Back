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

        const { imageUrls, subject, level, format, detail_level, max_length } = parseResult.data;

        // 检查是否启用流式模式（通过 header 控制）
        const enableStream = request.headers.get("x-enable-stream") === "true";

        const workflow = new ImageToPostWorkflow(
            Skills.imageParse,
            Skills.copyRewrite,
            Skills.fileGenerate
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
                        { imageUrls, subject, level, format, detail_level, max_length },
                        async (event) => {
                            // 将进度事件编码为 SSE 格式
                            const data = `data: ${JSON.stringify(event)}\n\n`;
                            await writer.write(encoder.encode(data));
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
        const result = await workflow.run({ imageUrls, subject, level, format, detail_level, max_length });
        return success(result);

    } catch (error) {
        console.error(error);
        return errorResponse("生成文章失败", ResultCode.ERROR, 500);
    }
}