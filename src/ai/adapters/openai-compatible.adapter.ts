import OpenAI from "openai";
import { LLMAdapter } from "./llm.interface";

export interface OpenAIConfig {
    /** API Key (如 DeepSeek, 通义千问的 Key) */
    apiKey?: string;
    /** API Base URL (如 https://api.deepseek.com) */
    baseURL?: string;
    /** 模型名称 (如 deepseek-chat, qwen-vl-max) */
    model?: string;
}

/**
 * [定义] OpenAI 兼容适配器
 * 支持所有兼容 OpenAI 接口标准的模型 (DeepSeek, Qwen, Moonshot, LocalLLM 等)。
 * 
 * [用途]
 * 只要服务商提供 OpenAI 格式的接口，就可以用这个 Adapter 连接。
 * 支持通过构造函数传入不同的配置，实现混合使用不同的模型。
 */
export class OpenAICompatibleAdapter implements LLMAdapter {
    private client: OpenAI;
    private model: string;

    constructor(config: OpenAIConfig = {}) {
        this.client = new OpenAI({
            apiKey: config.apiKey || process.env.OPENAI_API_KEY,
            baseURL: config.baseURL || process.env.OPENAI_BASE_URL
        });
        // 优先使用传入的 model，其次环境变量，最后默认值
        this.model = config.model || process.env.OPENAI_MODEL_NAME || "deepseek-chat";
    }

    async run(systemPrompt: string, input: any) {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify(input) }
            ],
            // 注意：部分模型可能不支持 json_object 模式，如果是那样需要移除这行
            response_format: { type: "json_object" } 
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content returned");
        
        // 尝试解析 JSON，如果模型返回的不是 JSON 字符串，这里会报错
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse JSON from LLM response:", content);
            throw e;
        }
    }
}
