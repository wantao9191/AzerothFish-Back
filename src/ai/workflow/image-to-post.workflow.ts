import { ImageParseSkill } from "../skill-engine/image-parse.skill";
import { CopyRewriteSkill } from "../skill-engine/copy-rewrite.skill";
import { FileGenerateSkill } from "../skill-engine/file-generate.skill";
type Format = "markdown" | "html" | "txt" | 'docx' | 'pdf';
interface ImageToPostOptions {
  imageUrl: string;
  subject: string;
  level: string;
  format: Format;
  detail_level: "low" | "medium" | "high";
  max_length: number;
}
/**
 * [定义] ImageToPostWorkflow (图片转帖子工作流)
 * 编排层，将多个 Skill 串联起来完成一个具体的业务需求。
 *
 * [用途]
 * 接收图片 URL，依次调用：
 * 1. ImageParseSkill (解析图片)
 * 2. CopyRewriteSkill (生成文案)
 * 3. FileGenerateSkill (生成文件)
 * 最终返回一个可用的帖子文件。
 *
 * [为什么这样做]
 * 实现了业务逻辑与 AI 能力的分离。
 * 可以在这里处理数据流转（把上一步的输出传给下一步），而不需要修改 Skill 本身。
 */
export class ImageToPostWorkflow {
  constructor(
    private imageParse: ImageParseSkill,
    private copyRewrite: CopyRewriteSkill,
    private fileGenerate: FileGenerateSkill
  ) { }

  async run(options: ImageToPostOptions) {
    const { imageUrl, subject, level, format, detail_level, max_length } = options;
    // Step 1: 解析图片
    const imageData = await this.imageParse.execute({
      image_url: imageUrl,
      extract_text: true,
      detail_level: detail_level
    });

    // Step 2: 生成文案 (依赖上一步的 imageData)
    const writtenContent = await this.copyRewrite.execute({
      image_analysis: imageData,
      subject: subject,
      level: level,
      max_length: max_length || 500
    });

    // Step 3: 生成文件 (依赖上一步的 copy)
    const file = await this.fileGenerate.execute({
      format: format,
      content: writtenContent.copy ?? ""
    });

    return file;
  }
}
