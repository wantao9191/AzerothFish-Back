import { z } from "zod";

export const generateSchema = z.object({
    imageUrls: z.array(z.string(), "图片链接无效").min(1, "图片链接不能为空"),
    subject: z.string().min(1, "主题不能为空"),
    level: z.string().min(1, "等级不能为空"),
    format: z.enum(["markdown", "html", "txt", "docx", "pdf"]).optional().default("docx"),
    detail_level: z.enum(["low", "medium", "high"]).optional().default("high"),
    max_length: z.number().int().positive("最大长度必须为正整数").optional().default(500),
    enable_review: z.boolean().optional().default(true),
    enable_rewrite: z.boolean().optional().default(true),
});

export const fileGenerateSchema = z.object({
    format: z.enum(["markdown", "html", "txt", "docx", "pdf"], {
        message: "格式必须是 markdown、html、txt、docx 或 pdf"
    }),
    content: z.string().min(1, "内容不能为空"),
});

export const documentGenerateSchema = z.object({
    format: z.enum(["markdown", "html", "txt", "docx", "pdf"], {
        message: "格式必须是 markdown、html、txt、docx 或 pdf"
    }),
    file_url: z.string().min(1, "格式化内容不能为空"),
    settings: z.record(z.string(), z.any()).optional(),
});