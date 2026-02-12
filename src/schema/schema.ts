import { z } from "zod";

export const generateSchema = z.object({
    imageUrl: z.string().url("图片链接无效"),
    subject: z.string().min(1, "主题不能为空"),
    level: z.string().min(1, "等级不能为空"),
    format: z.enum(["markdown", "html", "txt", "docx", "pdf"]),
    detail_level: z.enum(["low", "medium", "high"]),
    max_length: z.number().int().positive("最大长度必须为正整数"),
});