import { BaseSkill } from "./base.skill";
import { CopyRewriteInput, CopyRewriteOutput } from "../dto/copy-rewrite.dto";

/**
 * [定义] CopyRewriteSkill (文案改写技能)
 * 继承自 BaseSkill，负责根据输入信息生成社交媒体文案。
 *
 * [用途]
 * 接收图片分析结果、目标平台（如小红书）、语气风格，生成吸引人的文案。
 * 是 ImageToPostWorkflow 的核心生成环节。
 *
 * [为什么这样做]
 * 将文案生成逻辑独立出来，方便针对不同平台（Twitter, LinkedIn）微调 Prompt。
 * 可以单独测试文案生成的质量，而不受图片解析结果的影响。
 */
export class CopyRewriteSkill extends BaseSkill<
    CopyRewriteInput,
    CopyRewriteOutput
> {
    name = "copy-rewrite";

    protected buildSystemPrompt(): string {
        return `
你是一个资深的教育写作专家。

你的任务是根据输入的图片分析结果(image_analysis)，结合指定的学科(subject)和年级水平(level)，生成一篇高质量的教学文案或作文范文。

输入格式说明：
- subject: 目标学科（如语文、英语、历史等）。
- level: 目标受众等级（如小学、初中、高中）。
- image_analysis: 图片的原始内容，生成文案的依据。
- max_length: 生成的文案长度，单位为字。

写作要求：
1. 内容必须与图片原始内容紧密相关。
2. 语言风格和深度必须严格匹配【level】字段定义的水平。
3. 视角和侧重点应符合【subject】学科的特点。
4. 生成的文案长度必须严格匹配【max_length】字段定义的长度。
请直接返回 JSON 格式结果：
{ "copy": "生成的文案内容..." }
`;
    }
}
