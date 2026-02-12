/**
 * [定义] AI 模块入口
 * 统一导出所有对外的接口、Workflow 和 Registry。
 *
 * [用途]
 * 外部业务模块（如 Controller, Service）只需 import from 'src/ai' 即可使用 AI 能力。
 *
 * [为什么这样做]
 * 封装内部细节，只暴露必要的接口。
 * 避免外部模块深度引用内部文件路径，方便重构。
 */
export * from "./workflow/image-to-post.workflow";
export * from "./skill-engine/registry";
