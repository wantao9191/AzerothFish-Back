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
    private baseURL: string;

    constructor(config: OpenAIConfig = {}) {
        this.baseURL = config.baseURL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
        this.client = new OpenAI({
            apiKey: config.apiKey || process.env.OPENAI_API_KEY,
            baseURL: this.baseURL
        });
        // 优先使用传入的 model，其次环境变量，最后默认值
        this.model = config.model || process.env.OPENAI_MODEL_NAME || "deepseek-chat";
    }

    /**
     * 构建用户消息内容（文本 + 图片）
     */
    private buildUserContent(input: any): any {
        if (!input || typeof input !== 'object') {
            return JSON.stringify(input);
        }

        // 多图模式
        if (input.image_urls && Array.isArray(input.image_urls) && input.image_urls.length > 0) {
            const { image_urls, ...restInput } = input;
            return [
                { 
                    type: "text", 
                    text: JSON.stringify(restInput)
                },
                ...image_urls.map((url: string) => ({
                    type: "image_url",
                    image_url: { url }
                }))
            ];
        }

        // 单图模式
        if (input.image_url && typeof input.image_url === 'string') {
            const { image_url, ...restInput } = input;
            return [
                { 
                    type: "text", 
                    text: JSON.stringify(restInput)
                },
                {
                    type: "image_url",
                    image_url: { url: image_url }
                }
            ];
        }

        // 普通文本模式
        return JSON.stringify(input);
    }

    /**
     * 非流式调用（原有方法）
     */
    async run(systemPrompt: string, input: any) {
        try {
            const userContent = this.buildUserContent(input);

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ],
                response_format: { type: "json_object" } 
            });
    
            const content = response.choices[0].message.content;
            if (!content) throw new Error("No content returned");
            
            try {
                return JSON.parse(content);
            } catch (e) {
                console.error("Failed to parse JSON from LLM response:", content);
                throw e;
            }
        } catch (error: any) {
            console.error(`[LLM Error] Provider: ${this.baseURL}, Model: ${this.model}`);
            if (error.status === 402) {
                console.error("⚠️ Insufficient Balance (余额不足). Please check your API credit.");
            }
            throw error;
        }
    }

    /**
     * 流式调用 - 逐 token 返回
     * @param systemPrompt 系统提示词
     * @param input 输入参数
     * @param onChunk 接收每个 token 的回调函数
     * @returns 完整的响应结果
     */
    async runStream(
        systemPrompt: string, 
        input: any,
        onChunk?: (chunk: string) => void | Promise<void>
    ) {
        try {
            const userContent = this.buildUserContent(input);

            const stream = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ],
                stream: true, // 启用流式输出
                response_format: { type: "json_object" }
            });

            let fullContent = "";

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || "";
                if (delta) {
                    fullContent += delta;
                    if (onChunk) {
                        await onChunk(delta);
                    }
                }
            }

            if (!fullContent) throw new Error("No content returned");
            
            try {
                return JSON.parse(fullContent);
            } catch (e) {
                console.error("Failed to parse JSON from LLM response:", fullContent);
                throw e;
            }
        } catch (error: any) {
            console.error(`[LLM Error] Provider: ${this.baseURL}, Model: ${this.model}`);
            if (error.status === 402) {
                console.error("⚠️ Insufficient Balance (余额不足). Please check your API credit.");
            }
            throw error;
        }
    }
}
