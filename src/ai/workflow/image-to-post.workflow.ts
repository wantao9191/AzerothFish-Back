import { ImageParseSkill } from "../skill-engine/image-parse.skill";
import { CopyRewriteSkill } from "../skill-engine/copy-rewrite.skill";

export type Format = "markdown" | "html" | "txt" | 'docx' | 'pdf';

export interface ImageToPostOptions {
  imageUrls: string[];
  subject: string;
  level: string;
  format: Format;
  detail_level: "low" | "medium" | "high";
  max_length: number;
  /** 是否生成点评（仅在 enable_rewrite=true 时生效） */
  enable_review: boolean;
  /** 是否启用AI改写生成范文（false时直接使用OCR文本） */
  enable_rewrite: boolean;
}

/**
 * 进度事件类型
 */
export interface ProgressEvent {
  /** 事件类型 */
  type: 'step_complete' | 'complete' | 'error' | 'step_start';
  /** 当前步骤 */
  step: 'image_parse' | 'copy_rewrite';
  /** 步骤数据 */
  data?: any;
  /** 错误信息（仅在 error 时存在） */
  error?: string;
}

/**
 * 单篇作文的返回结构
 */
export interface ArticleResult {
  /**
   * 范文内容（纯文本）
   */
  content: string;

  /**
   * 作文点评（用于展示告知）
   */
  review: string;
}

/**
 * Workflow 的返回结构
 */
export interface ImageToPostResult {
  /**
   * 作文列表（当前一次只处理一篇，所以数组长度为1）
   */
  articles: ArticleResult[];
}
/**
 * [定义] ImageToPostWorkflow (图片转作文批改工作流)
 * 编排层，将多个 Skill 串联起来完成一个具体的业务需求。
 *
 * [用途]
 * 接收作文图片 URL，根据配置执行不同流程：
 * 
 * 完整模式（enable_rewrite=true）：
 * 1. ImageParseSkill (解析图片，提取文字)
 * 2. CopyRewriteSkill (生成范文和点评，enable_review 控制是否生成点评)
 * 3. FileGenerateSkill (生成范文文件)
 * 
 * 简化模式（enable_rewrite=false）：
 * 1. ImageParseSkill (解析图片，提取文字)
 * 2. FileGenerateSkill (直接将OCR文本生成文件)
 * 注：此模式下 enable_review 参数无效，不会生成点评
 *
 * [为什么这样做]
 * 实现了业务逻辑与 AI 能力的分离。
 * 可以在这里处理数据流转（把上一步的输出传给下一步），而不需要修改 Skill 本身。
 * 灵活支持不同场景：快速OCR提取 vs 深度AI改写批改。
 * 
 * [返回结构]
 * 返回数组结构，支持未来扩展多篇作文批量处理。
 * 当前一次只处理一篇作文，数组长度为1。
 */
export class ImageToPostWorkflow {
  constructor(
    private imageParse: ImageParseSkill,
    private copyRewrite: CopyRewriteSkill
  ) { }

  /**
   * 执行工作流（支持流式进度推送）
   * 
   * @param options 工作流选项
   * @param onProgress 进度回调函数（可选），用于接收实时进度和流式内容
   * @returns 最终结果
   */
  async run(
    options: ImageToPostOptions,
    onProgress?: (event: ProgressEvent) => void | Promise<void>
  ): Promise<ImageToPostResult> {
    const { imageUrls, subject, level, format, detail_level, max_length, enable_review, enable_rewrite } = options;

    try {
      // ========== Step 1: 解析图片 ==========
      await onProgress?.({
        type: 'step_start',
        step: 'image_parse'
      });
      const imageData = await this.imageParse.execute({
        image_urls: imageUrls,
        extract_text: true,
        detail_level: detail_level
      });

      await onProgress?.({
        type: 'step_complete',
        step: 'image_parse',
        data: {
          extracted_text: imageData.detected_text || ""
        }
      });

      // 根据 enable_rewrite 决定是否使用AI改写
      if (enable_rewrite) {
        // ========== Step 2: 生成范文和点评（AI改写模式） ==========
        await onProgress?.({
          type: 'step_start',
          step: 'copy_rewrite'
        });
        const writtenContent = await this.copyRewrite.execute({
          image_analysis: imageData,
          use_review: enable_review,
          subject: subject,
          level: level,
          max_length: max_length || 500
        });

        await onProgress?.({
          type: 'step_complete',
          step: 'copy_rewrite',
          data: {
            copy: writtenContent.copy || "",
            review: writtenContent.review || ""
          }
        });

        // ========== 完成 ==========
        const result = {
          articles: [
            {
              content: writtenContent.copy,
              review: writtenContent.review || ""
            }
          ]
        };

        await onProgress?.({
          type: 'complete',
          step: 'copy_rewrite',
          data: result
        });

        return result;
      }

      // ========== 不使用AI改写，直接使用OCR文本 ==========
      // 检查是否成功提取到文本
      if (!imageData.detected_text || imageData.detected_text.length === 0) {
        throw new Error("未能从图片中提取到文本内容，请确保图片清晰且包含文字");
      }

      // ========== 完成（简化模式，无点评） ==========
      const result = {
        articles: [
          {
            content: imageData.detected_text.join("\n"),
            review: "" // 简化模式下不生成点评
          }
        ]
      };

      await onProgress?.({
        type: 'complete',
        step: 'image_parse',
        data: result
      });

      return result;

    } catch (error: any) {
      // 错误处理
      await onProgress?.({
        type: 'error',
        step: 'image_parse',
        error: error.message || String(error)
      });
      throw error;
    }
  }
}
