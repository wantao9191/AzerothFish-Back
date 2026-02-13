import { db } from "@/db";
import { aiMetrics } from "@/db/schema";

/**
 * [定义] MetricsService (指标服务)
 * 负责收集和记录 AI 操作的性能数据。
 *
 * [用途]
 * 记录每次 Skill 调用的耗时、成功/失败状态等。
 * 目前仅输出到控制台，未来可对接 Prometheus 或 Datadog。
 *
 * [为什么这样做]
 * AI 调用通常较慢且昂贵，监控其性能对于优化用户体验和控制成本至关重要。
 */
export class MetricsService {
  async record(data: {
    skill: string;
    duration: number;
    tokens?: number;
    model?: string;
    success?: boolean;
    error?: string;
    metadata?: any;
  }) {
    console.log("[AI METRICS]", data);

    try {
      await db.insert(aiMetrics).values({
        skill: data.skill,
        duration: data.duration,
        tokens: data.tokens,
        model: data.model,
        success: data.success === false ? 0 : 1,
        error: data.error,
        metadata: data.metadata,
      });
    } catch (e) {
      console.error("Failed to record metrics to DB", e);
    }
  }
}
