import Anthropic from "@anthropic-ai/sdk";
import { LLMAdapter } from "./llm.interface";

/**
 * [定义] ClaudeAdapter (Claude 模型适配器)
 * 实现了 LLMAdapter 接口，专门用于调用 Anthropic Claude API。
 *
 * [用途]
 * 负责构建请求、发送给 Claude、解析返回的 JSON。
 *
 * [为什么这样做]
 * 将具体的模型调用细节（如 API Key, Model Name, Temperature）封装在这里。
 * 如果将来要换模型（如 GPT-4），只需新增一个 Adapter，不用改业务代码。
 */
export class ClaudeAdapter implements LLMAdapter {
    private client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });

    async run(systemPrompt: string, input: any) {
        const res = await this.client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            temperature: 0.3,
            max_tokens: 2000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: JSON.stringify(input) // 简单地将输入转为 JSON 字符串发给模型
                }
            ]
        });

        // 假设模型总是返回合法的 JSON
        return JSON.parse(res.content[0].text);
    }
}
