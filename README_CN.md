# AI-Protocol: 数据态的规则书

AI-Protocol 是 AI 模型集成领域的标准化协议规范，将"数据态的规则书"与"语言态的运行时"解耦，为 AI 生态系统提供统一的基础设施。

## 🎯 项目愿景

- **数据态的规则书**: 专注于定义 AI 模型的标准化接口和行为规范
- **语言态的运行时**: 专注于实现高效、可扩展的 AI 模型运行时（如 ai-lib）
- **生态系统解耦**: 协议规范与实现分离，支持多语言、多框架的统一生态

## 📁 项目结构

```
ai-protocol/
├── schemas/                    # JSON Schema 校验规范
│   └── v1.json                # v1.x 稳定版 Schema
├── v1/                        # v1.x 稳定版规范
│   ├── spec.yaml              # 基础规约：标准参数、事件枚举
│   ├── providers/             # 供应商配置（按厂商拆分，便于 PR）
│   │   ├── openai.yaml        # OpenAI 兼容接口
│   │   ├── anthropic.yaml     # Anthropic Claude 接口
│   │   ├── gemini.yaml        # Google Gemini 接口
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
└── scripts/                   # 维护脚本
```

## 🔧 核心概念

### 1. 算子化 (Operator-based)

AI-Protocol 通过**算子**的概念来标准化 AI 模型的行为：

- **参数算子**: 标准化参数映射 (`temperature`, `max_tokens`, `stream` 等)
- **事件算子**: 标准化流式事件 (`PartialContentDelta`, `ToolCallStarted` 等)
- **功能算子**: 标准化能力声明 (`chat`, `vision`, `tools`, `streaming` 等)

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
$schema: "https://spec.ai-protocol.org/schemas/v1.json"

id: anthropic
protocol_version: "1.1"

streaming:
  decoder:
    format: "sse"
    strategy: "anthropic_event_stream"

  event_map:
    - match: { "path": "$.type", "op": "eq", "value": "content_block_delta" }
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"
```

### 2. 模型注册示例

```yaml
# v1/models/claude.yaml
$schema: "https://spec.ai-protocol.org/schemas/v1.json"

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

### 3. 运行时集成

```rust
// ai-lib 中的动态加载示例
use ai_protocol::{ProtocolRegistry, ProviderConfig};

let registry = ProtocolRegistry::new();
let provider = registry.load_provider("anthropic").await?;
let model = registry.get_model("claude-3-5-sonnet").await?;
```

## 📋 验证与测试

```bash
# 运行 JSON Schema 校验
npm install -g ajv-cli
ajv validate -s schemas/v1.json -d "v1/providers/*.yaml"

# 运行兼容性测试
cargo test --package ai-protocol-validation
```

验证脚本也可在 `scripts/validate-configs.sh` 中找到。

## 🛣️ 路线图

### v1.x (当前稳定版)
- ✅ 主流 AI 供应商支持 (OpenAI, Anthropic, Gemini, etc.)
- ✅ 标准参数和事件规范化
- ✅ 工具调用和流式响应支持
- ✅ JSON Schema 约束

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

1. 在 `v1/providers/` 下创建新文件
2. 遵循 JSON Schema 规范
3. 添加相应的模型配置
4. 提交 PR 并附上测试用例

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

- **[ai-lib](https://github.com/your-org/ai-lib)**: Rust 运行时实现
- **[ai-lib-python](https://github.com/your-org/ai-lib-python)**: Python 运行时实现 (规划中)
- **[ai-protocol-registry](https://github.com/your-org/ai-protocol-registry)**: 社区配置仓库

---

**AI-Protocol** 将 AI 模型的复杂性抽象为标准化的协议，让开发者专注于业务逻辑而非供应商适配。
