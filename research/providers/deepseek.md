# Provider Survey: DeepSeek (Draft)

## Provider
- **id**: deepseek
- **Status**: draft (openai-compatible mappings added)
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/deepseek.yaml` is OpenAI-compatible and now declares:
  - `api_families/default_api_family/endpoints`
  - `termination` (finish_reason normalization)
  - `tooling` (tool_calls normalization)
  - `rate_limit_headers` (OpenAI rate limit headers)
  - `retry_policy` (exponential backoff for 429; retry 500 after brief wait)

## Official Docs (Sources)
DeepSeek official sources:
- Error codes: `https://api-docs.deepseek.com/quick_start/error_codes`
- FAQ (rate limits + keep-alive): `https://api-docs.deepseek.com/faq`

Secondary / observational sources (NOT official):
- Practical 429 envelope example (Microsoft Learn thread): `https://learn.microsoft.com/en-ie/answers/questions/2156697/i-get-a-rate-limit-error-rate-limit-of-8-per-86400s`

## Errors + Retry / Rate Limits (VERIFIED excerpts)

### 1) Error codes (VERIFIED excerpt)
Source (official): `https://api-docs.deepseek.com/quick_start/error_codes`

原文摘录（table）：
- `400 - Invalid Format`: Invalid request body format. Solution: modify request body.
- `401 - Authentication Fails`: Wrong API key.
- `402 - Insufficient Balance`: Ran out of balance.
- `422 - Invalid Parameters`: Invalid request parameters.
- `429 - Rate Limit Reached`: Sending requests too quickly. Solution: pace requests reasonably.
- `500 - Server Error`: Server encountered an issue. Solution: retry after a brief wait.
- `503 - Server Overloaded`: Server is overloaded due to high traffic. Solution: retry after a brief wait.

Normalization guidance:
- Treat 429/500/503 as transient (retryable with backoff), and 400/401/402/422 as non-retryable client/account errors.

### 2) Rate limits policy (VERIFIED excerpt)
Source (official): `https://api-docs.deepseek.com/faq`

原文摘录：
> The rate limit exposed on each account is adjusted dynamically according to our real-time traffic pressure and each account's short-term historical usage.
>
> We temporarily do not support increasing the dynamic rate limit exposed on any individual account...

Normalization guidance:
- Rate limits are **dynamic per account**; runtimes should avoid assuming a fixed RPM/TPM.

### 3) Streaming keep-alive / empty lines (VERIFIED excerpt)
Source (official): `https://api-docs.deepseek.com/faq`

原文摘录：
> ... we continuously return empty lines (for non-streaming requests) or SSE keep-alive comments (`: keep-alive`, for streaming requests) while waiting for the request to be scheduled.
> ... please make sure to handle these empty lines or comments appropriately.

Normalization guidance:
- For streaming, runtimes MUST ignore SSE comment lines beginning with `:` (e.g., `: keep-alive`).
- For non-streaming, runtimes SHOULD tolerate/ignore empty lines while waiting.

### 4) Practical error envelope example (secondary)
Source (not official): `https://learn.microsoft.com/en-ie/answers/questions/2156697/...`

Observed example:
```json
{
  "error": {
    "code": "RateLimitReached",
    "message": "Rate limit of 8 per 86400s exceeded for UserByModelByDay. Please wait 83652 seconds before retrying.",
    "details": "Rate limit of 8 per 86400s exceeded for UserByModelByDay. Please wait 83652 seconds before retrying."
  }
}
```

Note:
- Treat this as a hint that some deployments may include `error.details`; do NOT mark as DeepSeek-official until confirmed by DeepSeek docs.

## Mapping to `v1/spec.yaml` (implemented)
- **Termination reasons**:
  - DeepSeek (OpenAI-compatible) uses `finish_reason`. See `standard_schema.streaming_events.termination_reasons`.
- **Tool invocation model**:
  - DeepSeek uses OpenAI-style `tool_calls`. Normalize to `standard_schema.content_blocks.tool_use`.
  - `function.arguments` is typically a JSON string; runtimes SHOULD parse into an object for `tool_use.input`.

