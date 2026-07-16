# Provider Survey: Groq (Draft)

## Provider
- **id**: groq
- **Status**: draft (openai-compatible mappings added)
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/groq.yaml` is OpenAI-compatible and now declares:
  - `api_families/default_api_family/endpoints`
  - `termination` (finish_reason normalization)
  - `tooling` (tool_calls normalization)
  - `rate_limit_headers` (OpenAI rate limit headers)
  - `retry_policy` (exponential backoff for 429; retry 500 after brief wait)

## Official Docs (Sources)
- Groq API reference: `https://console.groq.com/docs/api`
- OpenAI rate limits (headers): `https://platform.openai.com/docs/guides/rate-limits`
- OpenAI error codes (429/500): `https://platform.openai.com/docs/guides/error-codes`
- OpenAI 429 handling (backoff): `https://help.openai.com/en/articles/5955604-how-can-i-solve-429-too-many-requests-errors`

## Mapping to `v1/spec.yaml` (implemented)
- **Termination reasons**:
  - Groq (OpenAI-compatible) uses `finish_reason`. See `standard_schema.streaming_events.termination_reasons`.
- **Tool invocation model**:
  - Groq uses OpenAI-style `tool_calls`. Normalize to `standard_schema.content_blocks.tool_use`.
  - `function.arguments` is typically a JSON string; runtimes SHOULD parse into an object for `tool_use.input`.

