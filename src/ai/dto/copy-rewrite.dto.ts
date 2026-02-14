import { ImageParseOutput } from "./image-parse.dto";

/**
 * [定义] CopyRewrite DTOs
 * 定义文案改写 Skill 的输入和输出。
 *
 * [用途]
 * 规范文案生成所需的上下文信息（图片分析结果、目标平台、语气）。
 *
 * [为什么这样做]
 * 结构化输入有助于构建更精准的 Prompt。
 */
export interface CopyRewriteInput {
    /**
     * 图片分析结果 (来自 ImageParseSkill)
     * e.g. { scene: "咖啡厅", objects: ["拿铁"], ... }
     * 用途：为文案提供视觉依据，避免瞎编
     */
    image_analysis: ImageParseOutput;

    /**
     * 目标学科
     * e.g. "语文", "数学", "英语", "物理", "化学", "生物", "地理", "历史", "政治"
     */
    subject: string;

    /**
     * 文案水平
     * e.g. "小学", "初中", "高中", "大学", "研究生", "博士"
     */
    level: string;

    /**
     * 生成的文案长度
     * e.g. 100, 200, 300
     */
    max_length: number;

    /**
     * 是否生成点评
     */
    use_review: boolean;
}

export interface CopyRewriteOutput {
    /**
     * 生成的范文内容（用于文档生成）
     * e.g. 根据学生作文改写的规范范文
     */
    copy: string;

    /**
     * 作文点评内容（用于展示告知）
     * e.g. 对学生作文的优缺点分析、建议等
     */
    review: string;
}
