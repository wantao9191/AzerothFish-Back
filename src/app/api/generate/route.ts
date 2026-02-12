import { NextRequest } from "next/server";
import { success, error as errorResponse, ResultCode } from "@/lib/response";
import { ImageToPostWorkflow } from "@/ai/workflow/image-to-post.workflow";
import { Skills } from "@/ai/skill-engine/registry";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSchema } from "@/schema/schema";

/**
 * @description 生成文章
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

        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues[0].message;
            return errorResponse(errorMessage, ResultCode.BAD_REQUEST, 400);
        }

        const { imageUrl, subject, level, format, detail_level, max_length } = parseResult.data;

        const workflow = new ImageToPostWorkflow(
            Skills.imageParse,
            Skills.copyRewrite,
            Skills.fileGenerate
        );
        const result = await workflow.run({ imageUrl, subject, level, format, detail_level, max_length });
        return success(result);
    } catch (error) {
        return errorResponse("生成文章失败", ResultCode.ERROR, 500);
    }
}