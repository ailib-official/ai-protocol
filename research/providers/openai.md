# Provider Survey: OpenAI (Draft)

## Provider
- **id**: openai
- **Status**: draft (stream/realtime error event verified)
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/openai.yaml` 已包含：SSE `data:` 前缀、`[DONE]`、choices fan-out、tool_calls delta、usage final chunk。
- 已补充：`api_families` / `default_api_family` / `endpoints`（避免 chat/completions/assistants/realtime 混淆）。
- 已补充：`rate_limit_headers` / `retry_policy`（基于官方 rate limits / error codes / 429 guidance）。

## Official Docs (Sources)
> 说明：当前环境的网页抓取返回内容不稳定。先把“权威链接”固定下来，并将需要证据化的条目列为 TODO。
> 后续我会基于这些链接补充“原文摘录（关键段落）”，再把条目从 TODO 转为 verified。

- Chat (Completions API reference): `https://platform.openai.com/docs/api-reference/completions`
- Chat (Create completion endpoint): `https://platform.openai.com/docs/api-reference/completions/create`
- Chat (API reference entry): `https://platform.openai.com/docs/api-reference/chat`
- Chat (Create chat completion endpoint): `https://platform.openai.com/docs/api-reference/chat/create`
- Streaming (guide): `https://platform.openai.com/docs/guides/streaming-responses`
- Tools (Assistants API reference): `https://platform.openai.com/docs/api-reference/assistants`
- Rate limits (Project rate limits): `https://platform.openai.com/docs/api-reference/project-rate-limits`
- Realtime server events (error): `https://platform.openai.com/docs/api-reference/realtime-server-events/error`
- Rate limits (guide): `https://platform.openai.com/docs/guides/rate-limits`
- Error codes (guide): `https://platform.openai.com/docs/guides/error-codes`
- 429 help article: `https://help.openai.com/en/articles/5955604-how-can-i-solve-429-too-many-requests-errors`

TODO（建议后续补充的官方入口）：
- Auth / API keys: `https://platform.openai.com/docs`（具体子页待补）
- Errors: `https://platform.openai.com/docs`（具体子页待补）
- Rate limits: `https://platform.openai.com/docs`（具体子页待补）

## Extracted Rules (What the runtime MUST do)

### 1) Endpoint + Request
- **API family clarification（需要在 protocol 中表达）**：
  - 该链接是 *Completions API*（非 Chat Completions / Responses）。在 `ai-protocol` 层需要明确“同一供应商存在多套 API 家族”，以及 v1 选择覆盖哪一套。
  - 现有 `v1/providers/openai.yaml` 明显是 OpenAI-style **Chat Completions**（`choices[].delta.*`），因此本次调研会以“streaming guide + tools(assistants)”补齐差异，同时把 completions API 作为“legacy/额外端点”记录。

- **Request shape（待证据化）**：
  - completions：prompt / max_tokens / temperature / top_p / stop / stream 等字段集合（TODO：摘录字段列表与类型约束）
  - assistants：assistant/run/threads/messages 的对象层级与工具绑定方式（TODO：摘录对象模型与关键字段）

- **Open questions**：
  - 是否需要同时标准化 `/chat/completions` 与 `/responses`（两者请求/响应结构差异对 v1 的影响）。
  - `response_format_mode=json_schema` 的失败语义（报错 vs 自动降级）是否可标准化。（TODO：需官方说明）

### 2) Response + Usage
- **usage**：当前配置假设 usage 可能在最终 chunk 返回（尤其 streaming 场景），需要以 streaming guide 证据化（TODO：原文摘录）。
- **finish_reason**：Chat Completions 中 finish_reason 枚举与含义需要证据化并纳入 `v1/spec.yaml` 的标准枚举（TODO）。

### 3) Streaming
- **Wire format**：SSE（`data: ` 行 + 空行分隔）+ done signal（`[DONE]`）。
- **frame boundary**：
  - runtime 需要按 `\n\n` 切分帧；
  - 每帧可包含一行或多行 `data:`，运行时应拼接为 payload（实现可选：按行解析/合并）。
- **delta contract（Chat Completions）**：
  - 文本：`choices[*].delta.content`
  - 工具：`choices[*].delta.tool_calls[*].function.{name,arguments}`
  - 完成：`choices[*].finish_reason`（通常出现在尾帧）
- **stream error frames**：
  - 除常规 `choices` 帧外，流式/实时通道可能出现 `error` 帧（见下方 StreamError 证据），运行时应将其映射为 `StreamError` 并默认记录日志。

TODO（待逐段引用 streaming guide 原文以标记为 verified）：
- 是否存在 `event:` 字段/多事件名；
- `usage` 是否只在最终 chunk 出现；
- tool_calls 增量字段的稳定性与合并规则描述。

### 4) Errors + Retry
- **retry (VERIFIED excerpts)**：
  - 429 rate limit errors: exponential backoff is recommended.
    Source: `https://help.openai.com/en/articles/5955604-how-can-i-solve-429-too-many-requests-errors`
  - 500 server errors: retry after a brief wait.
    Source: `https://platform.openai.com/docs/guides/error-codes`
- **idempotency**：是否支持 `Idempotency-Key` 需要确认（以及适用端点）。

### 5) Rate limits (VERIFIED excerpts)

#### Rate limits in headers (VERIFIED excerpt)
Source (official): `https://platform.openai.com/docs/guides/rate-limits`

原文摘录（header fields）：
- `x-ratelimit-limit-requests`
- `x-ratelimit-limit-tokens`
- `x-ratelimit-remaining-requests`
- `x-ratelimit-remaining-tokens`
- `x-ratelimit-reset-requests`
- `x-ratelimit-reset-tokens`

Normalization guidance:
- Runtimes SHOULD parse these headers and surface them as standard rate limit metadata.

#### Error codes of interest (VERIFIED excerpt)
Source (official): `https://platform.openai.com/docs/guides/error-codes`

原文摘录要点：
- `429` rate limit reached (requests)
- `429` quota exceeded / plan & billing
- `500` server error → retry after a brief wait

Normalization guidance:
- Treat `429` as potentially retryable; runtimes SHOULD distinguish rate-limit vs quota-exhausted when possible (e.g., by message).

需要协议层表达的字段（候选）：
- provider 级别：`rate_limits.dimensions = [rpm, tpm]`
- runtime 级别：`retry_policy.on_429 = backoff`（或在 error_class=rate_limited 时给出 retry_hint）

### 6) Realtime / Streaming Error Event (Evidence draft)
- **error as a first-class event**：Realtime 服务器事件中存在独立的 `error` 事件类型（而不是只依赖 HTTP 响应）。这意味着协议需要同时覆盖：
  - **HTTP-layer errors**（非流式 / 建连失败）
  - **stream-layer errors**（连接已建立后，按事件推送错误）
  - **realtime/rtc errors**（同样以 server event 推送）
  （来源：`realtime-server-events/error` 页面；证据样例见下）

官方说明摘录（关键语义 + 字段解释）：
- **Returned when an error occurs**：错误可能来自 client 或 server。
- **Most errors are recoverable and the session will stay open**：多数错误可恢复，session 会保持打开；建议实现方默认监控并记录 error message。
- 字段含义：
  - server event：`type`（必须为 `error`）、`event_id`（server event 的唯一 ID）
  - error object：`message`（人类可读）、`type`（如 `invalid_request_error` / `server_error`）、`code`（如有）、`event_id`（导致错误的 client event_id，如适用）、`param`（相关参数，如有）

证据样例（Realtime server event: error）：

```json
{
  "event_id": "event_890",
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "code": "invalid_event",
    "message": "The 'type' field is missing.",
    "param": null,
    "event_id": "event_567"
  }
}
```

可抽象成协议字段（候选）：
- `stream_event_id`（对应 `event_id`）
- `error.type`（如 `invalid_request_error`）
- `error.code`（如 `invalid_event`）
- `error.message`
- `error.param`（nullable）
- `related_event_id`（对应 `error.event_id`，指向“引发错误的事件/请求”）

需要协议层表达的字段（候选）：
- v1：可新增事件枚举 `Error`（或 `StreamError`），并定义标准字段（`code`/`message`/`type`/`param`/`retryable` 等）
- v2-alpha：将该 error 事件纳入 `streaming_events_v2` / `rtc_events` 的统一事件模型，并明确其与 session/sequence 的关联方式（event correlation）

## Mapping to ai-protocol (Proposed)

### Spec candidates (v1)
- **标准化 rate limit header 归一**：定义 `rate_limit_headers`（limit/remaining/reset，单位）。
- **统一 error 分类**：定义 `error_class`（auth/invalid_request/rate_limited/server_error 等）与 `retry_hint`。
- **统一 streaming frame contract**：定义 SSE/JSONL 的通用字段与 provider-specific decoder.strategy。

### Provider YAML candidates (openai)
- 增加 `api_families` / `endpoints`（声明支持 chat_completions / completions / assistants 的映射与默认选择），避免“同一 provider 里混淆不同 API 家族”。

### Mapping to `v1/spec.yaml` (implemented)
- **Termination reasons**:
  - OpenAI uses `finish_reason` (per candidate). Map to `standard_schema.streaming_events.termination_reasons`.
  - Example mapping guidance in spec: `stop → end_turn`, `length → max_tokens`, `tool_calls → tool_use`, `content_filter → refusal`.
- **Tool invocation model**:
  - OpenAI expresses tools via `tool_calls` (and streaming deltas via `choices[*].delta.tool_calls`).
  - Normalize to `standard_schema.content_blocks.tool_use` where `id/name/input` correspond to tool call id/function name/function arguments (parsed to object when possible).


