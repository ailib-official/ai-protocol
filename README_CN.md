# AI-Protocol

**供应商无关**的 AI 供应商清单与模型注册表规范 —— 供各语言运行时消费的**数据态规则书**（npm 包 **`@ailib-official/ai-protocol`**，包版本 **1.0.0**）。

[English](README.md)

AI-Protocol 标准化运行时与各供应商的交互（文本、视觉、音频、视频等模态）。它补充 [MCP](https://modelcontextprotocol.io)：MCP 侧重工具与上下文的高层协议；本仓库侧重**声明式 API 归一化**（端点、流式映射、错误、能力），使运行时加载同一套清单。

> **发布钉 vs 主线：** npm 已发布 **`1.0.0`**（标签 `v1.0.0`）。Git `main` 可能包含未发布的架构与元数据工作（身份映射、ME-001 模型能力、供应商准入波次）。请按你需要的包/标签钉住依赖；见 [CHANGELOG](CHANGELOG.md) 的 `Unreleased`。

## 在生态中的位置

| 层级 | 职责 |
|------|------|
| **本仓库** | Schema、YAML/JSON 清单、合规用例、构建产物 `dist/` |
| **运行时** | 加载清单、执行 HTTP/SSE、归一化事件（[ai-lib-rust](https://github.com/ailib-official/ai-lib-rust)、[ai-lib-python](https://github.com/ailib-official/ai-lib-python)、[ai-lib-ts](https://github.com/ailib-official/ai-lib-ts)、[ai-lib-go](https://github.com/ailib-official/ai-lib-go)） |
| **Mock** | [ai-protocol-mock](https://github.com/ailib-official/ai-protocol-mock)，无真实密钥的夹具测试 |

**公共权威面**（运行时 / GOV-006 应视为真相）：`schemas/`、`v1/`、`v2/`、`v2-alpha/`、`dist/`、`docs/`、`tests/compliance/`。  
见 [`docs/PUBLIC_SURFACE.md`](docs/PUBLIC_SURFACE.md)。[`archive/`](archive/README.md) 下历史材料**不是**线协议。

## 安装

```bash
npm install @ailib-official/ai-protocol@1.0.0
```

包 `files`：`dist`、`v1`、`v2`、`v2-alpha`、`schemas`。入口：`dist/index.json`。

生产环境优先消费 **`dist/` JSON**。别名解析使用 `dist/provider-identity.json`（见下）。

### Schema `$schema` URL

钉发布标签以保稳定，或跟随 `main` 取最新：

- 发布：`https://raw.githubusercontent.com/ailib-official/ai-protocol/v1.0.0/schemas/v1.json`
- 主线：`https://raw.githubusercontent.com/ailib-official/ai-protocol/main/schemas/v1.json`

v2 形状使用同一标签/`main` 规则下的 `schemas/v2/*.json`。

## 版本权威

三棵并存树。**`latest` ≠ 生产默认。**

| 树 | 角色 | 约略覆盖（main 尖端） |
|------|------|----------------------|
| **v1** | **LTS 线协议 / `production_default`** | ~37 供应商 + `v1/models/` 注册表 |
| **v2** | **演进尖端**（`dist/index.json` 的 `latest`） | ~21 供应商；contracts、packs、ME-001 元数据 |
| **v2-alpha** | 显式沙箱 | anthropic、gemini、openai |

来自 `dist/index.json`：

```json
"latest": "v2",
"authority": {
  "lts_wire": "v1",
  "evolution": "v2",
  "sandbox": "v2-alpha",
  "production_default": "v1",
  "latest_means": "evolution_tip_not_production_default"
}
```

规范说明：[`docs/VERSION_AUTHORITY.md`](docs/VERSION_AUTHORITY.md)。

## 供应商身份

规范 id 与别名已随包发布，供第三方消费：

- **映射：** `dist/provider-identity.json`
- **指针：** `dist/index.json` → `identity.map`
- **文档：** [`docs/PROVIDER_IDENTITY.md`](docs/PROVIDER_IDENTITY.md)

示例（非穷尽）：`google` → `gemini`，`kimi` → `moonshot`，`glm` → `zhipu`，`ernie` / `qianfan` → `baidu`。

查找顺序：精确 `id` → 清单 `aliases` → 已发布映射 → 失败关闭。

## 仓库布局

```
ai-protocol/
├── schemas/                 # JSON Schema（v1.json、spec.json、schemas/v2/*）
├── v1/                      # LTS：providers/ + models/
├── v2/                      # 演进：providers/、contracts/、packs/、架构夹具
├── v2-alpha/                # 沙箱
├── dist/                    # 构建 JSON + index.json + provider-identity.json
├── docs/                    # 规范 / 实验性配套文档
├── tests/compliance/        # 跨运行时合规用例
├── examples/
├── scripts/                 # validate / build / gates / ME 辅助脚本
└── archive/                 # 非权威历史
```

关键文档：[`PUBLIC_SURFACE`](docs/PUBLIC_SURFACE.md) · [`VERSION_AUTHORITY`](docs/VERSION_AUTHORITY.md) · [`PROVIDER_IDENTITY`](docs/PROVIDER_IDENTITY.md) · [`MANIFEST_LOGICAL_LAYERS`](docs/MANIFEST_LOGICAL_LAYERS.md) · [`MANIFEST_AUTHORITY`](docs/MANIFEST_AUTHORITY.md) · [`MODEL_CAPABILITY_METADATA`](docs/MODEL_CAPABILITY_METADATA.md) · [`SPEC`](docs/SPEC.md) · [`GETTING_STARTED`](docs/GETTING_STARTED.md)

## 核心概念

- **算子（Operators）** — 参数映射、流式事件映射、能力声明、错误分类 / 限流头。公开的 `retry_policy` 是 **Execution Spec 默认值**，不是宿主 Policy（[`MANIFEST_LOGICAL_LAYERS`](docs/MANIFEST_LOGICAL_LAYERS.md)）。
- **版本隔离** — 各树按各自 Schema 校验；不要从 v1 静默回落到 v2-alpha。
- **模块化清单** — 每个供应商一个文件，便于 PR。

### 模型能力元数据（实验性，PT-ME-001）

在 **v2** `ai_provider` 清单中，按模型事实写在 `metadata.models.<id>` 下：

- 可选 `model_capabilities` / `modalities`（及相关字段），见 [`schemas/v2/metadata-model-entry.json`](schemas/v2/metadata-model-entry.json)
- **省略 = 未知**（切勿把未知序列化为 `false`）
- 若存在模型级字段，优先于供应商级 `capabilities.required` / `optional` 广告

文档：[`docs/MODEL_CAPABILITY_METADATA.md`](docs/MODEL_CAPABILITY_METADATA.md)。基线门禁：`npm run validate:arch`。

## 快速示例

### 供应商（v1 节选）

```yaml
# v1/providers/anthropic.yaml
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/v1.0.0/schemas/v1.json"

id: anthropic
protocol_version: "1.5"

streaming:
  decoder:
    format: "anthropic_sse"
    strategy: "anthropic_event_stream"
```

### 错误 / 限流（节选）

```yaml
error_classification:
  by_http_status:
    "401": "authentication"
    "429": "rate_limited"
    "500": "server_error"

rate_limit_headers:
  requests_limit: "x-ratelimit-limit-requests"
  requests_remaining: "x-ratelimit-remaining-requests"

retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  retry_on_http_status: [429, 500]
```

### 模型注册表（v1）

```yaml
# v1/models/… — 模型挂在 models: 下
models:
  claude-3-5-sonnet:
    provider: anthropic
    model_id: "claude-3-5-sonnet-20241022"
    context_window: 200000
    capabilities: [chat, vision, tools, streaming]
```

运行时按各自加载器文档消费 `dist/`（或 YAML 源）并解析 `provider/model` 字符串。

## 供应商（main 尖端）

**v1（约 37）：** ai21、anthropic、anyscale、azure、baichuan、baidu、cerebras、cohere、deepinfra、deepseek、doubao、fireworks、gemini、groq、huggingface、hunyuan、jina、lepton、minimax、mistral、moonshot、nvidia、openai、openrouter、perplexity、qwen、replicate、sensenova、siliconflow、spark、stability、tiangong、together、writer、xai、yi、zhipu。

**v2（约 21，演进）：** anthropic、baichuan、baidu、cerebras、cohere、deepseek、doubao、gemini、groq、hunyuan、jina、minimax、mistral、moonshot、nvidia、openai、perplexity、qwen、xai、yi、zhipu —— 含 PT-ADM 准入波次（xai/mistral/minimax；perplexity/yi/baichuan；hunyuan/baidu/cerebras），main 上带有 ME-001 `metadata.models` 充实。

**v2-alpha：** anthropic、gemini、openai。

精确文件列表见 `v1/providers/`、`v2/providers/`、`v2-alpha/providers/`。

## 校验、构建与门禁

```bash
npm install
npm run validate              # AJV 2020-12：providers/models/examples/schemas/specs
npm run validate:providers
npm run validate:models
npm run validate:schemas
npm run validate:compliance
npm run validate:arch         # 架构夹具 + ME-001 / 身份门禁
npm run build                 # YAML → dist/；写出 index.json + provider-identity.json

npm run drift:check
npm run gate:manifest-authority
npm run gate:manifest-consumption
npm run gate:compliance-matrix
npm run gate:fullchain
npm run release:gate
```

可选：`fact-check:models`、`me001:oneshot-candidate`（咨询性；见 [`docs/ME001_ONESHOT_CANDIDATE.md`](docs/ME001_ONESHOT_CANDIDATE.md)）。

CI：`.github/workflows/validate.yml`（校验 + 构建）；`governance-report.yml`（仅报告门禁）。细节：[`docs/CI_VALIDATION_EXPLAINED.md`](docs/CI_VALIDATION_EXPLAINED.md)。

Wave-3 门禁策略（PR 审阅报告态 vs `main` 上必过 fullchain）：见 CHANGELOG / 治理文档 —— 在显式对等声明之前，生产默认线协议仍为 **v1**。

## 贡献

1. 按 Schema 添加 `v1/providers/<id>.yaml`（并/或晋升到 `v2/`）
2. 使用 v1 注册表时在 `v1/models/` 登记模型
3. 建议在 `research/providers/` 留下带 VERIFIED 证据的调研笔记
4. 运行 `npm run validate`（触及 v2 元数据 / 身份时加跑 `validate:arch`）
5. 提交 PR

指南：[`docs/CONTRIBUTING_PROVIDER.md`](docs/CONTRIBUTING_PROVIDER.md)。

## 相关运行时

| 运行时 | 仓库 |
|---------|------|
| Rust | [ailib-official/ai-lib-rust](https://github.com/ailib-official/ai-lib-rust) |
| Python | [ailib-official/ai-lib-python](https://github.com/ailib-official/ai-lib-python) |
| TypeScript | [ailib-official/ai-lib-ts](https://github.com/ailib-official/ai-lib-ts) |
| Go | [ailib-official/ai-lib-go](https://github.com/ailib-official/ai-lib-go) |
| Mock 服务 | [ailib-official/ai-protocol-mock](https://github.com/ailib-official/ai-protocol-mock) |

运行时包版本独立演进 —— 请查看各仓库 README / crates.io / PyPI / npm。

## 许可证

双许可：[Apache-2.0](LICENSE-APACHE) 或 [MIT](LICENSE-MIT)，任选其一。

除非另行声明，贡献默认按上述双许可纳入，无额外条款。
