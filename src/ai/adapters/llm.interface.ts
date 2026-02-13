/**
 * [定义] LLMAdapter (LLM 适配器接口)
 * 定义了系统与大语言模型交互的标准契约。
 *
 * [用途]
 * 规定了所有 LLM 实现类必须具备 `run` 方法和可选的 `runStream` 方法。
 *
 * [为什么这样做]
 * 依赖倒置原则 (DIP)：上层模块 (Skill) 不应该依赖底层模块 (具体模型)，两者都应该依赖抽象 (接口)。
 * 这样可以轻松替换底层实现。
 */
export interface LLMAdapter {
    /** 非流式调用 */
    run(systemPrompt: string, input: any): Promise<any>;
    
    /** 流式调用（可选） */
    runStream?(
        systemPrompt: string, 
        input: any, 
        onChunk?: (chunk: string) => void | Promise<void>
    ): Promise<any>;
}
