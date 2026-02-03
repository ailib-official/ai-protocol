# Provider Survey: NVIDIA API Catalog (NVIDIA Build)

## Provider
- **id**: nvidia
- **Status**: verified (documentation + API reference)
- **Protocol target**: v1.x (stable)

## Identity
- **Name**: NVIDIA API Catalog (also known as NVIDIA Build)
- **Category**: third_party_aggregator
- **Official catalog**: https://build.nvidia.com/explore/discover
- **API docs**: https://docs.api.nvidia.com/nim/docs, https://docs.api.nvidia.com/nim/reference/llm-apis

## Endpoint (VERIFIED)
- **Base URL**: `https://integrate.api.nvidia.com`
- **Chat completions**: `POST /v1/chat/completions`
- **List models**: `GET /v1/models` (OpenAI-style list; response has `data` array)
- Source: [LLM APIs – Overview](https://docs.api.nvidia.com/nim/reference/llm-apis) — "URL: https://integrate.api.nvidia.com", "Endpoint: POST /v1/chat/completions"

## Authentication
- **Type**: Bearer token
- **Env var**: `NVIDIA_API_KEY` (keys typically begin with `nvapi-`)
- **Key provisioning**: https://build.nvidia.com/explore/discover (Get API Key)
- Free tier: 10,000 requests to any available model (per published docs).

## Request/Response
- **Payload**: OpenAI-compatible (`openai_style`)
- Same request/response shape as OpenAI Chat Completions (messages, model, stream, temperature, max_tokens, tools, etc.).

## Models (6 selected – capability / tech leading)
Verified against [LLM APIs – Models](https://docs.api.nvidia.com/nim/reference/llm-apis):

| model_id | Display / notes |
|----------|------------------|
| `nvidia-nemotron-4-340b-instruct` | Nemotron 4 340B Instruct (NVIDIA flagship) |
| `nvidia/llama3-chatqa-1.5-70b` | Llama 3 ChatQA 1.5 70B |
| `deepseek-ai/deepseek-r1` | DeepSeek R1 (reasoning) |
| `mistralai/mistral-large-2-instruct` | Mistral Large 2 Instruct |
| `mistralai/mixtral-8x22b-instruct` | Mixtral 8x22B Instruct |
| `meta/llama3-70b` | Meta Llama 3 70B |

## Termination / tooling
- Same as OpenAI: `finish_reason` (stop, length, tool_calls, content_filter); tool_calls as `function.name` / `function.arguments`.
- Config uses `termination.source_field: "finish_reason"` and `tooling.source_model: "openai_tool_calls"`.

## Retry / errors
- No provider-specific rate limit header docs found; generic exponential backoff for 429/5xx applied in provider config.
- Error shape: OpenAI-style `error.message`, `error.code`, `error.type`.

## Availability
- **Regions**: global (NVIDIA DGX Cloud; no explicit CN/US/EU split in public docs).
- **Health check**: `GET /v1/models` with expected_status [200, 401]; 401 accepted as “service reachable”.
