import { BaseSkill } from "./base.skill";
import { ImageParseInput, ImageParseOutput } from "../dto/image-parse.dto";

/**
 * [定义] ImageParseSkill (图片解析技能)
 * 继承自 BaseSkill，专门用于从图片中提取结构化信息。
 *
 * [用途]
 * 接收图片数据，输出场景、物体、氛围等 JSON 数据。
 * 是 ImageToPostWorkflow 的第一步。
 *
 * [为什么这样做]
 * 将"看图"这个能力原子化。
 * 不同的业务场景（如发帖、图片搜索、图片打标）都可以复用这个 Skill。
 */
export class ImageParseSkill extends BaseSkill<
  ImageParseInput,
  ImageParseOutput
> {
  name = "image-parse";

  protected buildSystemPrompt(): string {
    return `
你是一个专业的视觉分析 AI。
请仅返回严格的 JSON 格式。
提取图片中检测到的主体文本(detected_text)。
图片可能有多个，请分别提取每个图片中的检测到的主体文本,根据上下文判断是否是同一个主体，如果是同一个主体，请合并成一个主体，如果不是同一个主体，请分别提取。
如果图片中没有检测到主体文本，请返回空数组。

{
  "detected_text": ["string"]
}
`;
  }
}
