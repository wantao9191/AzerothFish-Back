# AI 模块架构说明

本文档描述了 `src/ai` 目录下 AI 模块的设计思路、核心组件及其用途。

## 1. 目录结构与定义 (Directory Structure & Definitions)

该模块采用了 **Skill-Workflow-Adapter** 分层架构，旨在实现 AI 能力的模块化、可复用和易维护。

```
src/ai/
├── adapters/       # [Adapter 层] LLM 模型适配器
│   ├── llm.interface.ts    # 定义统一的 LLM 调用接口
│   └── claude.adapter.ts   # 具体实现 (如 Claude 3.5 Sonnet)
├── dto/            # [Data Transfer Object] 数据传输对象
│   ├── image-parse.dto.ts  # 定义 Skill 的输入/输出结构
│   └── ...
├── metrics/        # [Metrics 层] 监控与统计
│   └── metrics.service.ts  # 记录 AI 调用的耗时、Token 使用等指标
├── skill-engine/   # [Skill 层] 原子能力引擎
│   ├── base.skill.ts       # 所有 Skill 的基类 (模板模式)
│   ├── image-parse.skill.ts # 具体 Skill 实现 (如图片解析)
│   ├── copy-rewrite.skill.ts # 文案改写 Skill
│   └── registry.ts         # Skill 注册表 (方便统一管理)
└── workflow/       # [Workflow 层] 业务流程编排
    └── image-to-post.workflow.ts # 将多个 Skill 串联成完整业务 (如图片转帖子)
```

### 核心概念

1.  **Skill (技能)**
    *   **定义**: 最小的、原子化的 AI 能力单元。
    *   **职责**: 封装特定的 Prompt (提示词) 和输入/输出处理逻辑。例如：`ImageParseSkill` 只负责从图片提取信息，`CopyRewriteSkill` 只负责生成文案。
    *   **基类**: `BaseSkill<Input, Output>`，强制要求定义输入输出类型。

2.  **Workflow (工作流)**
    *   **定义**: 业务逻辑的编排层。
    *   **职责**: 将多个 Skill 组合起来完成复杂的业务目标。它负责数据的流转（将上一个 Skill 的输出作为下一个 Skill 的输入），不直接处理 Prompt。
    *   **示例**: `ImageToPostWorkflow` (图片 -> 解析 -> 文案 -> 生成文件)。

3.  **Adapter (适配器)**
    *   **定义**: 对底层大语言模型 (LLM) 的抽象。
    *   **职责**: 屏蔽不同模型厂商 (OpenAI, Anthropic, DeepSeek) 的 API 差异，提供统一的 `run(prompt, input)` 接口。

## 2. 用途 (Usage)

这种架构主要用于解决以下问题：

*   **复用性**: `ImageParseSkill` 可以在“发小红书”流程中使用，也可以在“图片搜索”流程中使用，无需重复编写 Prompt。
*   **标准化**: 所有 Skill 都遵循相同的接口，输入输出都有严格的类型定义 (DTO)，减少了“幻觉”导致的格式错误。
*   **可测试性**: 每个 Skill 可以单独测试，也可以通过 Mock Adapter 进行单元测试。

### 示例流程 (Image To Post)

1.  **Input**: 用户上传一张图片 URL。
2.  **Step 1 (ImageParseSkill)**: AI 分析图片，输出结构化的 JSON 数据（场景、物体、氛围）。
3.  **Step 2 (CopyRewriteSkill)**: 将分析结果 + 目标平台风格（如小红书）输入给 AI，生成吸引人的文案。
4.  **Step 3 (FileGenerateSkill)**: 将文案格式化为 Markdown 文件。
5.  **Output**: 生成好的帖子文件。

## 3. 为什么要这样做 (Design Rationale)

### 3.1 解耦 (Decoupling)
业务逻辑 (Workflow) 与 AI 实现 (Skill) 分离；AI 实现 (Skill) 与底层模型 (Adapter) 分离。
*   **好处**: 如果未来要从 Claude 切换到 GPT-4，只需修改 Adapter，无需改动任何业务代码。

### 3.2 提示词工程化 (Prompt Engineering as Code)
Prompt 不再是散落在代码各处的字符串，而是被封装在 Skill 类中 (`buildSystemPrompt`)。
*   **好处**: 可以对 Prompt 进行版本控制、优化和独立测试。

### 3.3 强类型约束 (Type Safety)
通过泛型 `BaseSkill<I, O>` 和 DTO，我们强制规定了 AI 的输入和输出结构。
*   **好处**: 在编译期就能发现数据结构错误，而不是等到运行时 AI 返回了错误的 JSON 格式才报错。

### 3.4 可观测性 (Observability)
`BaseSkill` 内置了 `metrics.record()`。
*   **好处**: 自动记录每个 Skill 的调用耗时和成功率，帮助开发者监控 AI 服务的稳定性。
