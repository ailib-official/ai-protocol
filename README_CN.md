# AI-Protocol: 数据态的规则书

AI-Protocol 是一个**供应商无关**（provider-agnostic）的 AI 模型规范，标准化了我们与智能体的交互方式，**无论模态如何**（文本、视觉、音频、视频）。我们将"数据态的规则书"与"语言态的运行时"解耦，为 AI 生态系统提供统一的基础设施。

**我们通过提供原始 API 归一化的声明式运行时，来补充像 [MCP](https://modelcontextprotocol.io) 这样的标准。** 虽然 MCP 专注于工具调用和上下文管理的高级协议，AI-Protocol 专注于底层 API 调用的标准化和归一化，使运行时能够统一处理不同供应商的 API。

## 🎯 项目愿景

- **数据态的规则书**: 专注于定义 AI 模型的标准化接口和行为规范
- **语言态的运行时**: 专注于实现高效、可扩展的 AI 模型运行时（如 ai-lib-rust）
- **生态系统解耦**: 协议规范与实现分离，支持多语言、多框架的统一生态
- **供应商无关**: 统一不同 AI 供应商的 API，实现真正的跨供应商互操作性
- **跨模态支持**: 标准化文本、视觉、音频、视频等多种模态的交互方式

## 📁 项目结构

```
ai-protocol/
├── schemas/                    # JSON Schema 校验规范
│   ├── v1.json                # v1.x 供应商/模型配置 Schema
│   └── spec.json              # 规范文件 (spec.yaml) Schema
├── v1/                        # v1.x 稳定版规范
│   ├── spec.yaml              # 基础规约：标准参数、事件枚举
│   ├── providers/             # 供应商配置（按厂商拆分，便于 PR）
│   │   ├── openai.yaml        # OpenAI 兼容接口
│   │   ├── anthropic.yaml     # Anthropic Claude 接口
│   │   ├── gemini.yaml        # Google Gemini 接口
│   │   ├── groq.yaml          # Groq 兼容接口
│   │   ├── deepseek.yaml      # DeepSeek 兼容接口
│   │   ├── qwen.yaml          # Qwen (DashScope) 兼容接口
│   │   └── ...                # 更多供应商
│   └── models/                # 模型实例注册表
│       ├── gpt.yaml           # GPT 系列模型
│       ├── claude.yaml        # Claude 系列模型
│       └── ...                # 更多模型
├── v2-alpha/                  # v2-alpha 实验版：多模态与实时特性
│   ├── spec.yaml              # 实验性算子定义
│   └── providers/             # 实验性供应商配置
├── examples/                  # 配置示例
│   └── tool_accumulation.yaml # 工具累积模式示例
├── docs/                      # 文档
│   ├── SPEC.md                # 供应商清单规范
│   ├── CI_VALIDATION_EXPLAINED.md  # CI 校验说明
│   └── FACT_CHECKING_MODELS.md     # 模型注册表核查（可选，无需 API Key）
├── research/                  # 调研文档（官方 API 文档摘录与验证）
│   └── providers/             # 各供应商的官方文档调研
│       ├── openai.md          # OpenAI 官方 API 规则（VERIFIED）
│       ├── anthropic.md       # Anthropic 官方 API 规则（VERIFIED）
│       ├── gemini.md          # Gemini 官方 API 规则（VERIFIED）
│       └── ...                # 更多供应商调研
└── scripts/                   # 维护脚本
```

## 🔧 核心概念

### 1. 算子化 (Operator-based)

AI-Protocol 通过**算子**的概念来标准化 AI 模型的行为：

- **参数算子**: 标准化参数映射 (`temperature`, `max_tokens`, `stream` 等)
- **事件算子**: 标准化流式事件 (`PartialContentDelta`, `ToolCallStarted`, `StreamError` 等)
- **功能算子**: 标准化能力声明 (`chat`, `vision`, `tools`, `streaming`, `multimodal` 等)
- **错误处理算子**: 标准化错误分类、限流和重试策略（`error_classification`, `retry_policy`, `rate_limit_headers`）

### 2. 版本化隔离

- **v1.x**: 生产环境稳定版，支持当前主流 AI 模型
- **v2-alpha**: 实验版，探索多模态流、实时指令等前沿特性
- **Schema 约束**: 每个配置文件都通过 JSON Schema 严格校验

### 3. 模块化维护

- **供应商独立**: 每个 AI 供应商的配置独立维护，便于社区贡献
- **模型注册**: 模型实例作为配置文件引用供应商定义
- **PR 友好**: 修改单个供应商不会影响其他配置

## 🚀 快速开始

### 1. 供应商配置示例

```yaml
# v1/providers/anthropic.yaml
$schema: "https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json"

id: anthropic
protocol_version: "1.5"

streaming:
  decoder:
    format: "anthropic_sse"
    strategy: "anthropic_event_stream"

  event_map:
    - match: "$.type == 'content_block_delta' && $.delta.type == 'text_delta'"
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"
```

> **Schema URL 最佳实践**: 你可以将 `$schema` URL 锁定到特定的发布版本以保证稳定性：
> - `https://raw.githubusercontent.com/hiddenpath/ai-protocol/v0.2.1/schemas/v1.json` (锁定到特定版本)
> - `https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json` (跟随 main 分支最新版本)

### 2. 错误处理和限流配置示例

```yaml
# v1/providers/openai.yaml (部分)
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "429": "rate_limited"  # 可能是限流或配额耗尽
    "500": "server_error"

rate_limit_headers:
  requests_limit: "x-ratelimit-limit-requests"
  requests_remaining: "x-ratelimit-remaining-requests"
  retry_after: null  # OpenAI 不使用标准 Retry-After

retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  jitter: "full"
  retry_on_http_status: [429, 500]
  notes:
    - "429 可能是限流或配额耗尽，运行时应检查错误消息"
```

### 3. 模型注册示例

```yaml
# v1/models/claude.yaml
$schema: "https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json"

models:
  claude-3-5-sonnet:
    provider: anthropic
    model_id: "claude-3-5-sonnet-20241022"
    context_window: 200000
    capabilities: [chat, vision, tools, streaming, agentic, reasoning]
    pricing:
      input_per_token: 0.000003
      output_per_token: 0.000015
```

### 4. 运行时集成

```rust
// ai-lib-rust 中的动态加载示例
use ai_lib_rust::protocol::ProtocolLoader;

// 默认情况下，加载器优先读取 `dist/` 目录 (JSON) 以获得生产环境的高效性，
// 并回退到 `v1/` 目录 (YAML) 以方便开发调试。
let loader = ProtocolLoader::new();
let provider = loader.load_provider("anthropic").await?;
let model = loader.load_model("anthropic/claude-3-5-sonnet").await?;
```

## 📋 验证与测试

```bash
# 安装依赖
npm install

# 运行 JSON Schema 校验（全部）
npm run validate

# 运行特定验证
npm run validate:providers   # 仅验证供应商配置
npm run validate:models      # 仅验证模型配置
npm run validate:examples    # 仅验证示例
npm run validate:specs       # 仅验证规范文件
npm run validate:schemas     # 仅验证 JSON Schema 语法
```

规范验证脚本为 `scripts/validate.js`，使用 AJV v8 配合 JSON Schema 2020-12 和 ajv-formats。  
可选的运行时模型核查（以文档为准，注册表无需 API Key）：见 [docs/FACT_CHECKING_MODELS.md](docs/FACT_CHECKING_MODELS.md)。

## 📦 构建与分发

AI-Protocol 以预编译的 JSON 文件形式分发，以确保运行时效率和零解析开销。

```bash
# 先校验，再构建 JSON 制品
npm run validate
npm run build
```

请先运行 `npm run validate`。此命令将：
1.  清理 `dist/` 目录以移除之前构建的陈旧文件。
2.  将 `v1/` 与 `v2-alpha/` 下的 YAML 转为 JSON 输出到 `dist/`。
3.  生成 `dist/index.json` 版本索引文件。

运行时（如 `ai-lib-rust`）应当直接消费 `dist/` 目录。

### CI/CD 流水线

GitHub Actions 工作流 (`validate.yml`) 自动执行：
- 使用 `npm ci` + `npm run validate` 验证所有配置
- 使用 `npm run build` 构建 JSON 制品
- 将 `dist/` 目录作为构建产物上传
- 运行额外的 yamllint 检查 YAML 风格（不阻塞）

详细 CI 文档请参见 [docs/CI_VALIDATION_EXPLAINED.md](docs/CI_VALIDATION_EXPLAINED.md)。

## 🛣️ 路线图

### v1.x (当前稳定版)
- ✅ 主流 AI 供应商支持 (OpenAI, Anthropic, Gemini, Groq, DeepSeek, Qwen)
- ✅ 标准参数和事件规范化
- ✅ 工具调用和流式响应支持
- ✅ JSON Schema 约束
- ✅ 错误处理和分类标准化（`error_classification`, 13 种标准错误类）
- ✅ 限流和重试策略标准化（`rate_limit_headers`, `retry_policy`）
- ✅ API 家族声明（`api_families`, `endpoints`）避免请求/响应模型混淆
- ✅ 终止原因归一化（`termination_reasons`）跨供应商统一

### v2-alpha (实验版进行中)
- 🔄 多模态流交织 (`FrameInterleave` 算子)
- 🔄 实时指令 (`StateSync` 算子)
- 🔄 无模式映射 (Schema-less Mapping)
- 🔄 高级工具累积模式

### v2.x (未来规划)
- 📅 音频/视频流式处理
- 📅 实时协作会话
- 📅 模型切换和迁移
- 📅 性能监控和 QoS

## 🤝 贡献指南

### 添加新供应商

1. 在 `v1/providers/` 下创建新文件（例如 `new-provider.yaml`）
2. 遵循 JSON Schema 规范（`schemas/v1.json`）
3. 在 `research/providers/` 下添加官方文档调研（`new-provider.md`），包含 VERIFIED 证据
4. 在 `v1/models/` 下添加相应的模型配置
5. 提交 PR 并附上测试用例和验证结果

**所有配置都托管在本仓库中**，社区配置与官方配置享受同等的版本控制和校验流程。

### 添加新算子

1. 在相应版本的 `spec.yaml` 中定义新算子
2. 更新 JSON Schema
3. 在运行时中实现算子逻辑
4. 添加示例配置

## 📄 License

This project is licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT License ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you shall be dual licensed as above, without any additional terms or conditions.

## 🔗 相关项目

- **[ai-lib-rust](https://github.com/hiddenpath/ai-lib-rust)**: Rust 运行时实现
- **[ai-lib-python](https://github.com/hiddenpath/ai-lib-python)**: Python 运行时实现 (规划中)

> **说明**: AI-Protocol 本身已经包含配置注册功能。社区可以通过 PR 直接贡献新的供应商配置和模型注册到本仓库的 `v1/providers/` 和 `v1/models/` 目录，无需单独的配置仓库。

---

**AI-Protocol** 将 AI 模型的复杂性抽象为标准化的协议，让开发者专注于业务逻辑而非供应商适配。
