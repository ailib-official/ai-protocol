# Provider Survey: Anthropic (Draft)

## Provider
- **id**: anthropic
- **Status**: draft
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/anthropic.yaml` 已包含：
  - 版本头：`anthropic-version`
  - streaming decoder.strategy：`anthropic_event_stream`
  - event_map：`content_block_delta`(text/thinking)、`input_json_delta`、`message_stop` 等
  - accumulator：对 tool args 的 stateful 合并（partial_json + flush_on）
  - 已补充：`api_families` / `default_api_family` / `endpoints`（messages API）
  - 已补充：`rate_limit_headers` / `retry_policy`（基于官方 errors / rate limits 证据与 SDK retry 行为）。

## Official Docs (Sources)
> 说明：当前环境的网页抓取返回内容不稳定。先固定“权威链接”，后续逐段补充原文摘录并标记为 verified。

- Messages API (reference): `https://docs.anthropic.com/zh-CN/api/messages`
- Streaming / event stream (guide): `https://docs.anthropic.com/zh-CN/api/messages-streaming`
- Tool use (guide): `https://docs.anthropic.com/zh-CN/docs/build-with-claude/tool-use`
- Errors (reference): `https://docs.anthropic.com/en/api/errors`
- Rate limits (reference): `https://docs.anthropic.com/en/api/rate-limits`
- SDK retry behavior (PyPI): `https://pypi.org/project/anthropic/0.9.0/`

TODO（建议后续补充的官方入口）：
- API overview: `https://docs.anthropic.com/zh-CN/api/overview`
- Auth: `https://docs.anthropic.com/zh-CN/api/overview`（具体段落待摘录）
- Errors: `https://docs.anthropic.com/zh-CN/api/errors`
- Rate limits: `https://docs.anthropic.com/zh-CN/api/rate-limits`

## Extracted Rules (What the runtime MUST do)

### 1) Endpoint + Request
- **强制版本头**：`anthropic-version`（以及其更新策略）需要协议层可表达。
- **system message 语义**：system 与 user/assistant content 的结构是否固定（需证据化）。

### 2) Response + Usage
- **stop_reason（VERIFIED）**：枚举及语义（来自 Messages API 官方文档）：
  - `"end_turn"`: the model reached a natural stopping point
  - `"max_tokens"`: we exceeded the requested `max_tokens` or the model's maximum
  - `"stop_sequence"`: one of your provided custom `stop_sequences` was generated
  - `"tool_use"`: the model invoked one or more tools
  - `"pause_turn"`: we paused a long-running turn; you may continue in a subsequent request
  - `"refusal"`: when streaming classifiers intervene to handle potential policy violations

  行为语义（同段原文）：
  - non-streaming：该值总是 non-null
  - streaming：在 `message_start` 事件中为 null，之后事件为 non-null
  来源：`https://docs.anthropic.com/fr/api/messages`
- **citations**：若存在原生 citations/来源字段，需纳入标准字段或 metadata。

### 3) Streaming
- **事件序列规则（VERIFIED）**：官方 Streaming 文档给出的典型事件结构（SSE）：
  1. `message_start`
  2. 0..N 个 content blocks，每个包含：
     - `content_block_start`
     - 0..N `content_block_delta`
     - `content_block_stop`
  3. `message_delta`
  4. `message_stop`
  补充：期间可能穿插 `ping` 事件
  来源：`https://docs.anthropic.com/en/docs/build-with-claude/streaming`

- **事件类型与含义（VERIFIED / secondary）**：
  - `message_start`（includes `message.id`）
  - `content_block_start`
  - `content_block_delta`（e.g., `text_delta`, `input_json_delta`）
  - `content_block_stop`
  - `message_delta`（contains `stop_reason` and `usage` near the end）
  - `message_stop`（terminal）
  来源：`https://docs.kushrouter.com/reference/events-anthropic`
- **tool args 合并**：`input_json_delta` 的 partial JSON 合并规则需要成为“标准算子”。

- **Streaming refusals（VERIFIED）**：
  - Starting with Claude 4 models, streaming responses return `stop_reason: \"refusal\"` when streaming classifiers intervene.
  来源：`https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/handle-streaming-refusals`

### 4) Errors + Retry
#### HTTP errors + envelope (VERIFIED excerpt)
Source (official): `https://docs.anthropic.com/en/api/errors`

原文摘录要点：
- HTTP error → error type mapping:
  - 400 `invalid_request_error`
  - 401 `authentication_error`
  - 403 `permission_error`
  - 404 `not_found_error`
  - 413 `request_too_large`
  - 429 `rate_limit_error`
  - 500 `api_error`
  - 529 `overloaded_error`
- Errors are returned as JSON with top-level `error` object including `type` and `message`.
- Response includes `request_id` for tracking/debugging.

Normalization guidance:
- Map `error.type`/`error.message` and `request_id` via `features.response_mapping.error.*` for consistent error reporting.

#### Rate limits + retry-after (VERIFIED excerpt)
Source (official): `https://docs.anthropic.com/en/api/rate-limits`

原文摘录要点：
- Exceeding rate limits returns 429 with a `retry-after` header indicating how long to wait.
- Rate limit headers:
  - `anthropic-ratelimit-requests-limit`
  - `anthropic-ratelimit-requests-remaining`
  - `anthropic-ratelimit-requests-reset`
  - `anthropic-ratelimit-tokens-limit`
  - `anthropic-ratelimit-tokens-remaining`
  - `anthropic-ratelimit-tokens-reset`

Normalization guidance:
- Map these headers into `provider.rate_limit_headers.*`.
- On 429, runtimes SHOULD respect `retry-after` when present.

#### SDK retry behavior (VERIFIED excerpt)
Source: `https://pypi.org/project/anthropic/0.9.0/`

原文摘录要点（Retries）：
- Certain errors are automatically retried 2 times by default, with a short exponential backoff.
- Connection errors, 408, 409, 429, and >=500 are retried by default.

Normalization guidance:
- This supports a provider default `retry_policy` of exponential backoff with `max_retries = 2` for these status codes.

### 5) Tool Use (VERIFIED)
- **tool_use content block（结构与语义）**：
  - `type`: `"tool_use"`
  - `id`: tool invocation id
  - `name`: requested tool name
  - `input`: tool input parameters
  - 运行流程：模型返回 `tool_use` → 应用执行工具 → 可用 `tool_result` 内容块把结果回传给模型
  来源：`https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-request-response.html`

## Mapping to ai-protocol (Proposed)

### Spec candidates (v1)
- **header requirements**：支持 “provider requires headers” 的声明式配置。
- **stream event contract**：把 Anthropic 的 event types 抽象为通用的 stream event lifecycle（block_start/delta/block_stop/message_stop）。

### Mapping to `v1/spec.yaml` (implemented)
- **Termination reasons (VERIFIED)**:
  - Anthropic uses `stop_reason`. Map to `standard_schema.streaming_events.termination_reasons`.
  - Verified enum: `end_turn | max_tokens | stop_sequence | tool_use | pause_turn | refusal`.
  - Streaming behavior: `stop_reason` is null in `message_start`, non-null thereafter.
- **Tool content blocks (VERIFIED)**:
  - Anthropic emits `tool_use` blocks (id/name/input). Normalize to `standard_schema.content_blocks.tool_use`.
  - Tool execution results returned via `tool_result` blocks. Normalize to `standard_schema.content_blocks.tool_result` using `tool_use_id` to link to the originating `tool_use.id`.


