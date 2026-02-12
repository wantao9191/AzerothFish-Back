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
}

export interface CopyRewriteOutput {
    /**
     * 生成的最终文案
     * e.g. "今天的咖啡真好喝... #下午茶 #生活"
     */
    copy: string;
}
