import { NextRequest } from "next/server";
import { success, error as errorResponse, ResultCode } from "@/lib/response";
import { Skills } from "@/ai/skill-engine/registry";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fileGenerateSchema } from "@/schema/schema";

/**
 * @description 文件生成接口（独立使用，不需要workflow）
 * @description 根据指定的格式类型和内容，生成格式化的文档
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
        const parseResult = fileGenerateSchema.safeParse(body);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues[0].message;
            console.error(errorMessage);
            return errorResponse(errorMessage, ResultCode.BAD_REQUEST, 400);
        }

        const { format, content } = parseResult.data;

        // 直接调用 FileGenerateSkill，不需要通过 workflow
        const result = await Skills.fileGenerate.execute({
            format,
            content
        });

        return success({
            file: result
        });

    } catch (error: any) {
        console.error("文件生成失败:", error);
        return errorResponse(
            error.message || "文件生成失败", 
            ResultCode.ERROR, 
            500
        );
    }
}
