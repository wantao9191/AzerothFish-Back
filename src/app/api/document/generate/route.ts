import { NextRequest } from "next/server";
import { error as errorResponse, ResultCode } from "@/lib/response";
import { DocumentGenerator } from "@/lib/document-generator";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { documentGenerateSchema } from "@/schema/schema";
import { FileGenerateOutput } from "@/ai/dto/file-generate.dto";

/**
 * @description 文档生成接口
 * @description 接收 FileGenerateSkill 的输出，生成实际的文档文件（docx/pdf/txt/html/markdown）
 * @param request
 * @returns {Promise<Response>} 返回文档的二进制数据
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
        const parseResult = documentGenerateSchema.safeParse(body);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.issues[0].message;
            console.error(errorMessage);
            return errorResponse(errorMessage, ResultCode.BAD_REQUEST, 400);
        }

        const { format, file_url, settings } = parseResult.data;

        // 构造 FileGenerateOutput
        const fileOutput: FileGenerateOutput = {
            file_url,
            settings
        };

        // 生成文档
        const buffer = await DocumentGenerator.generate(fileOutput, format);

        // 设置响应头
        const contentType = getContentType(format);
        const filename = getFilename(format);

        return new Response(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error: any) {
        console.error("文档生成失败:", error);
        return errorResponse(
            error.message || "文档生成失败", 
            ResultCode.ERROR, 
            500
        );
    }
}

/**
 * 获取 Content-Type
 */
function getContentType(format: string): string {
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
function getFilename(format: string): string {
    const timestamp = new Date().getTime();
    switch (format.toLowerCase()) {
        case 'docx':
            return `document_${timestamp}.docx`;
        case 'pdf':
            return `document_${timestamp}.pdf`;
        case 'html':
            return `document_${timestamp}.html`;
        case 'txt':
            return `document_${timestamp}.txt`;
        case 'markdown':
            return `document_${timestamp}.md`;
        default:
            return `document_${timestamp}`;
    }
}
