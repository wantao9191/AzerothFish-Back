import { ImageParseSkill } from "../skill-engine/image-parse.skill";
import { CopyRewriteSkill } from "../skill-engine/copy-rewrite.skill";
import { FileGenerateSkill } from "../skill-engine/file-generate.skill";
import { FileGenerateOutput } from "../dto/file-generate.dto";

export type Format = "markdown" | "html" | "txt" | 'docx' | 'pdf';

export interface ImageToPostOptions {
  imageUrls: string[];
  subject: string;
  level: string;
  format: Format;
  detail_level: "low" | "medium" | "high";
  max_length: number;
}

/**
 * 进度事件类型
 */
export interface ProgressEvent {
  /** 事件类型 */
  type: 'step_start' | 'step_progress' | 'step_complete' | 'complete' | 'error';
  /** 当前步骤 */
  step: 'image_parse' | 'copy_rewrite' | 'file_generate';
  /** 进度百分比 (0-100) */
  progress: number;
  /** 步骤数据 */
  data?: any;
  /** 流式文本片段（仅在 step_progress 时存在） */
  chunk?: string;
  /** 错误信息（仅在 error 时存在） */
  error?: string;
}

/**
 * 单篇作文的返回结构
 */
export interface ArticleResult {
  /**
   * 范文文件（用于文档生成）
   */
  file: FileGenerateOutput;
  
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
 * 接收作文图片 URL，依次调用：
 * 1. ImageParseSkill (解析图片，提取文字)
 * 2. CopyRewriteSkill (生成范文和点评)
 * 3. FileGenerateSkill (生成范文文件)
 * 最终返回范文文件和点评内容。
 *
 * [为什么这样做]
 * 实现了业务逻辑与 AI 能力的分离。
 * 可以在这里处理数据流转（把上一步的输出传给下一步），而不需要修改 Skill 本身。
 * 
 * [返回结构]
 * 返回数组结构，支持未来扩展多篇作文批量处理。
 * 当前一次只处理一篇作文，数组长度为1。
 */
export class ImageToPostWorkflow {
  constructor(
    private imageParse: ImageParseSkill,
    private copyRewrite: CopyRewriteSkill,
    private fileGenerate: FileGenerateSkill
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
    const { imageUrls, subject, level, format, detail_level, max_length } = options;
    
    try {
      // ========== Step 1: 解析图片 ==========
      await onProgress?.({ 
        type: 'step_start', 
        step: 'image_parse', 
        progress: 0 
      });

      const imageData = await this.imageParse.execute({
        image_urls: imageUrls,
        extract_text: true,
        detail_level: detail_level
      });

      await onProgress?.({ 
        type: 'step_complete', 
        step: 'image_parse', 
        progress: 20,
        data: { 
          extracted_text: imageData.detected_text 
        }
      });

      // ========== Step 2: 生成范文和点评（流式） ==========
      await onProgress?.({ 
        type: 'step_start', 
        step: 'copy_rewrite', 
        progress: 20 
      });

      let accumulatedContent = "";

      const writtenContent = await this.copyRewrite.executeStream(
        {
          image_analysis: imageData,
          subject: subject,
          level: level,
          max_length: max_length || 500
        },
        // 流式回调：每生成一段文字就推送
        async (chunk: string) => {
          accumulatedContent += chunk;
          await onProgress?.({
            type: 'step_progress',
            step: 'copy_rewrite',
            progress: 20 + Math.min(60, Math.floor(accumulatedContent.length / 10)), // 动态进度
            chunk: chunk // 传递文字片段
          });
        }
      );

      await onProgress?.({ 
        type: 'step_complete', 
        step: 'copy_rewrite', 
        progress: 80,
        data: { 
          copy: writtenContent.copy,
          review: writtenContent.review 
        }
      });

      // ========== Step 3: 生成文件 ==========
      await onProgress?.({ 
        type: 'step_start', 
        step: 'file_generate', 
        progress: 80 
      });

      const file = await this.fileGenerate.execute({
        format: format,
        content: writtenContent.copy ?? ""
      });

      await onProgress?.({ 
        type: 'step_complete', 
        step: 'file_generate', 
        progress: 100,
        data: { file }
      });

      // ========== 完成 ==========
      const result = {
        articles: [
          {
            file: file,
            review: writtenContent.review
          }
        ]
      };

      await onProgress?.({ 
        type: 'complete', 
        step: 'file_generate', 
        progress: 100,
        data: result
      });

      return result;

    } catch (error: any) {
      // 错误处理
      await onProgress?.({
        type: 'error',
        step: 'image_parse',
        progress: 0,
        error: error.message || String(error)
      });
      throw error;
    }
  }
}
