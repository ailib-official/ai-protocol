# AI-Protocol Research: Standardization Dimensions (v1.x)

本文件用于定义“调研时必须覆盖的维度”，并将其映射为未来 `v1/spec.yaml` 与 `schemas/v1.json` 的结构化条目。

## 1) 接口面（HTTP/Endpoint）
- **Base URL / Path**：是否固定 base_url，是否需要 template（如 Azure）。
- **API 版本机制**：path 版本、header 版本（如 `anthropic-version`）、query 版本等。
- **资源与端点**：
  - Chat/Message：`/chat/completions`、`/messages`、`/responses` 等
  - Embeddings / Moderation / Images / Audio（若纳入 v1/v2）
- **Content-Type/Accept**：JSON、SSE、JSONL，是否有特殊边界/分隔符。

## 2) 鉴权（Auth）
- **方式**：bearer、api-key header、query param、AK/SK 签名（未来扩展）。
- **Header/Query 细节**：header 名称、token 前缀、是否支持多 key。
- **额外强制头**：如 Anthropic 的版本头。

## 3) 请求模型（Request Semantics）
- **消息结构**：role/parts/content blocks；系统消息位置；多段内容（text/image/audio）。
- **参数集**：
  - sampling：temperature/top_p/top_k
  - length：max_tokens/stop
  - determinism：seed
  - tools：tools/tool_choice/parallel_tool_calls
  - reasoning：reasoning_effort/think/（供应商特有）
- **工具调用**：
  - tool 定义 schema（JSON Schema / function signature）
  - tool_choice 策略语义与默认值
  - 多工具并行/串行与上限
- **结构化输出**：json_object/json_schema/response_format 细节（严格性、失败行为）。
- **安全/审查/过滤**：安全设置、拒答策略、敏感内容标注（未来可能扩展）。

## 4) 响应模型（Response Semantics）
- **候选项结构**：single vs multi-candidate；候选 id/index。
- **文本输出路径**：message/content/parts 的差异。
- **工具调用回包**：tool_call 的 id/name/args 结构，是否需要二次解析（JSON string vs object）。
- **usage/计费**：
  - prompt/completion tokens 的字段与单位
  - usage 是否只在最后一帧出现
- **finish/stop 原因**：finish_reason/stop_reason 的枚举与含义。
- **引用/citations**：是否原生支持，字段结构如何表达。

## 5) 流式（Streaming）
- **协议**：SSE / chunked JSON / JSONL。
- **帧边界**：delimiter、prefix、done signal、空行/注释处理。
- **事件类型**：供应商 event 类型枚举、字段差异。
- **增量合成规则**：
  - text delta 合并策略
  - tool args 的增量 JSON 合并策略（stateful accumulator）
  - 多候选 fan-out 规则

## 6) 错误语义（Errors）
- **HTTP 状态码到错误类型**：429/5xx/4xx 分型。
- **错误对象结构**：message/code/type/param 等字段。
- **可重试性规则**：哪些错误建议重试，是否有 `Retry-After`。
- **幂等性**：是否支持 Idempotency-Key，在哪些端点有效。

## 7) 限流与配额（Rate Limits / Quotas）
- **速率限制**：RPS、RPM、TPM 等维度。
- **返回头**：limit/remaining/reset 的头部命名与单位。
- **并发限制**：连接数与 streaming 连接上限（如有）。

## 8) 兼容层与网关（Compatibility / Gateway）
- **OpenAI-compatible**：哪些字段“名义兼容但语义不同”。
- **网关路由模型名**：`provider/model` vs 原生 model id。
- **差异最小化策略**：在 provider 文件中声明“兼容层偏差”。

## 9) 版本化策略（Protocol Versioning）
- **目录版本**：`v1/` 对应 `v1.x` 系列；`v2-alpha/` 对应实验系列。
- **文件内版本**：`protocol_version`（例如 1.1）与 schema 版本绑定策略。


