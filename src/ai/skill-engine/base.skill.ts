import { LLMAdapter } from "../adapters/llm.interface";
import { MetricsService } from "../metrics/metrics.service";

/**
 * [定义] BaseSkill (技能基类)
 * 这是一个抽象类，定义了所有 AI 技能 (Skill) 的通用结构和行为。
 * 采用了模板方法模式 (Template Method Pattern)。
 *
 * [用途]
 * 1. 规范化：强制所有 Skill 实现 buildSystemPrompt 方法。
 * 2. 统一流程：在 execute 中统一处理 LLM 调用、性能监控 (Metrics) 和错误处理。
 * 3. 类型安全：通过泛型 <I, O> 约束输入输出类型。
 *
 * [为什么这样做]
 * 避免在每个 Skill 中重复编写调用 LLM 和记录日志的代码。
 * 方便未来统一升级（例如：想给所有 Skill 加重试机制，只需修改这里）。
 */
export abstract class BaseSkill<I, O> {
  abstract name: string;

  constructor(
    protected llm: LLMAdapter,
    protected metrics: MetricsService
  ) {}

  /**
   * [定义] 构建系统提示词
   * 每个子类必须实现此方法，返回该技能专属的 System Prompt。
   */
  protected abstract buildSystemPrompt(): string;

  /**
   * [定义] 执行技能
   * 包含完整的生命周期：开始计时 -> 构建 Prompt -> 调用 LLM -> 记录指标 -> 返回结果。
   */
  async execute(input: I): Promise<O> {
    const start = Date.now();

    const result = await this.llm.run(
      this.buildSystemPrompt(),
      input
    );

    await this.metrics.record({
      skill: this.name,
      duration: Date.now() - start
    });

    return result;
  }
}
