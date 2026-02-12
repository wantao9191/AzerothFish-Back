import { OpenAICompatibleAdapter } from "../adapters/openai-compatible.adapter";
import { MetricsService } from "../metrics/metrics.service";
import { ImageParseSkill } from "./image-parse.skill";
import { CopyRewriteSkill } from "./copy-rewrite.skill";
import { FileGenerateSkill } from "./file-generate.skill";

const metrics = new MetricsService();

// 1. 定义不同的 LLM 配置
// 这里的 Key 和 URL 最好从环境变量读取，这里为了演示硬编码了示例或者使用 process.env

// [文本生成模型] DeepSeek V3 - 便宜又好用，适合写文案
const deepSeekAdapter = new OpenAICompatibleAdapter({
  apiKey: process.env.DEEP_SEEK_API_KEY,
  baseURL: process.env.DEEP_SEEK_URL,
  model: "deepseek-chat"
});

// [视觉模型] 通义千问 Qwen-VL - 视觉识别能力强
// 注意：如果您的 Qwen-VL 不兼容 OpenAI 格式，则需要单独写一个 QwenAdapter
// 这里假设通过阿里云的 OpenAI 兼容接口调用
const qwenVisionAdapter = new OpenAICompatibleAdapter({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_URL,
  model: "qwen3-vl-plus"
});

/**
 * [定义] Skills Registry (技能注册表)
 * 混合使用策略：
 * - ImageParse: 使用 Qwen (视觉强)
 * - CopyRewrite: 使用 DeepSeek (文本生成强且便宜)
 * - FileGenerate: 使用 DeepSeek (便宜)
 */
export const Skills = {
  imageParse: new ImageParseSkill(qwenVisionAdapter, metrics),
  copyRewrite: new CopyRewriteSkill(deepSeekAdapter, metrics),
  fileGenerate: new FileGenerateSkill(deepSeekAdapter, metrics)
};
