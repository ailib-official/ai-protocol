# Provider Survey: Qwen (Draft)

## Provider
- **id**: qwen
- **Status**: draft (openai-compatible mappings added)
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/qwen.yaml` uses DashScope compatible-mode and is OpenAI-compatible at the request/response level.
- It now declares:
  - `api_families/default_api_family/endpoints`
  - `termination` (finish_reason normalization)
  - `tooling` (tool_calls normalization)
  - `rate_limit_headers` (OpenAI-compatible x-ratelimit-*; includes retry-after when present)
  - `retry_policy` (short exponential backoff; 2 retries by default in client libs)

## Official Docs (Sources)
Alibaba Cloud official sources:
- OpenAI compatibility (DashScope compatible-mode): `https://www.alibabacloud.com/help/en/model-studio/developer-reference/compatibility-of-openai-with-dashscope`
- Qwen API reference: `https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference`

Secondary / observational sources (NOT Alibaba Cloud official):
- Rate limit headers inference tooling (Go): `https://pkg.go.dev/github.com/cecil-the-coder/ai-provider-kit/pkg/ratelimit`
- Client retry behavior (PyPI): `https://pypi.org/project/qwenai/`

## Errors + Retry / Rate Limits (VERIFIED excerpts)

### 1) HTTP status codes (VERIFIED excerpt)
Sources (official):
- `https://www.alibabacloud.com/help/en/model-studio/developer-reference/compatibility-of-openai-with-dashscope`
- `https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference`

原文摘录（status code | description）：
- `400` Invalid Request Error (request is invalid; see error message)
- `401` Incorrect API key provided
- `429` Rate limit reached for requests (QPS/QPM or other limits exceeded)
- `429` You exceeded your current quota... (quota exceeded or payment overdue)
- `500` The server had an error while processing your request
- `503` The engine is currently overloaded, please try again later

Normalization guidance:
- Treat `429` as either throttling (rate limit) or quota/payment issue; runtimes SHOULD surface the error message to help users distinguish.
- Treat `500/503` as transient server-side errors.

### 2) 429 semantics (VERIFIED excerpt)
Source (official): `https://www.alibabacloud.com/help/en/model-studio/developer-reference/compatibility-of-openai-with-dashscope`

原文摘录要点：
- `429` can mean rate limit exceeded (QPS/QPM/other limits) OR quota/payment issue.

Normalization guidance:
- On `429`, apply backoff and/or respect any retry headers when present, but avoid infinite retries when the message indicates quota/payment problems.

### 3) Rate limit headers / retry-after (secondary, inferred)
Source (not official): `https://pkg.go.dev/github.com/cecil-the-coder/ai-provider-kit/pkg/ratelimit`

Observed/inferred:
- Compatible-mode may expose OpenAI-like `x-ratelimit-*` headers and may include `retry-after` on 429.
- DashScope may emit additional `dashscope-` / `x-dashscope-` headers.

Note:
- Keep these as optional hints until verified by Alibaba Cloud docs or captured real response headers.

### 4) Client retry behavior (secondary)
Source (not official): `https://pypi.org/project/qwenai/`

Claimed default behavior (Retries excerpt):
- Automatically retries certain errors 2 times by default with short exponential backoff.
- Retries include connection errors, 408, 409, 429, and >=500 errors.

Note:
- Treat this as a reasonable default policy template, but not as Alibaba Cloud official guidance.

## Mapping to `v1/spec.yaml` (implemented)
- **Termination reasons**:
  - Qwen compatible-mode uses `finish_reason`. See `standard_schema.streaming_events.termination_reasons`.
- **Tool invocation model**:
  - Qwen compatible-mode uses OpenAI-style `tool_calls`. Normalize to `standard_schema.content_blocks.tool_use`.
  - `function.arguments` is typically a JSON string; runtimes SHOULD parse into an object for `tool_use.input`.

