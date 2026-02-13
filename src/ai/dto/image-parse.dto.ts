/**
 * [定义] ImageParse DTOs
 * 定义图片解析 Skill 的输入和输出数据结构。
 *
 * [用途]
 * ImageParseInput: 告诉调用者需要传什么（图片 URL, 是否提取文字）。
 * ImageParseOutput: 告诉调用者会得到什么（场景, 物体, 氛围）。
 *
 * [为什么这样做]
 * 确保 AI 产出的数据符合预期，方便前后端类型联调。
 */
export interface ImageParseInput {
    image_urls: string[];
    extract_text?: boolean;
    detail_level?: "low" | "medium" | "high";
}

export interface ImageParseOutput {
    /**
     * 图片中检测到的文字内容 (OCR)
     * e.g. ["SALE 50% OFF", "店铺名称"]
     */
    detected_text: string[];
}
