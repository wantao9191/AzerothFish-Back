import { BaseSkill } from "./base.skill";
import { FileGenerateInput, FileGenerateOutput } from "../dto/file-generate.dto";   
// 简单的 DTO 定义 (也可以放到单独的文件中)




/**
 * [定义] FileGenerateSkill (文件生成技能)
 * 这是一个特殊的 Skill，它可能不一定调用 LLM，或者是调用 LLM 进行格式化。
 * 在这里，我们假设它负责将内容整理并保存为文件。
 *
 * [用途]
 * 将生成的文案最终落地为文件（如 .md）。
 *
 * [为什么这样做]
 * 虽然这看起来像个工具函数，但将其封装为 Skill 可以保持 Workflow 中调用的一致性。
 * 未来如果需要 AI 自动排版（例如生成 Notion 格式），可以直接在这里接入 LLM。
 */
export class FileGenerateSkill extends BaseSkill<
    FileGenerateInput,
    FileGenerateOutput
> {
    name = "file-generate";

    protected buildSystemPrompt(): string {
        // 如果只是简单的文件写入，可能不需要复杂的 System Prompt
        // 但为了保持架构一致，我们还是定义它，或者让它做一个简单的格式化任务
        return `
你是一个文档格式化助手。
请将输入的内容整理为标准的格式。
返回 JSON: { "file_path": "建议的文件名", "content": "格式化后的内容" }
`;
    }

    // 可以重写 execute 方法来实现非 LLM 逻辑，或者混合使用
    // 这里为了演示，我们还是保留默认的 LLM 调用逻辑
}
