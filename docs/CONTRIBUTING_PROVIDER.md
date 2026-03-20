# Contributing Providers to AI-Protocol

**Version**: v0.4.0 | **Last Updated**: 2026-02-05

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Understanding Provider Manifests](#understanding-provider-manifests)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Provider Manifest Reference](#provider-manifest-reference)
6. [Validation and Testing](#validation-and-testing)
7. [Model Registration](#model-registration)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Submitting Your Contribution](#submitting-your-contribution)

---

## Overview

This guide walks you through adding a new AI provider to AI-Protocol. By contributing a provider manifest, you enable users of AI-Protocol runtimes (ai-lib-rust, ai-lib-python, and others) to use your provider without writing provider-specific code.

### What You'll Create

1. **Provider Manifest** (`v1/providers/your-provider.yaml`) - Describes your provider's API
2. **Model Registry** (`v1/models/your-models.yaml`) - Lists available models
3. **Supporting Documentation** (optional) - In `/research/providers/your-provider.md`)

### Why Contribute?

- Make your provider accessible to all AI-Protocol users
- No need for users to implement provider-specific code
- Automatic feature parity with other providers (streaming, tools, vision, etc.)
- Community feedback and improvements

---

## Prerequisites

### Required

- **Provider API Access**: Developer account and API key for the provider
- **API Documentation**: Official API documentation for reference
- **Basic YAML Knowledge**: Understanding of YAML structure
- **Node.js 18+**: For validation (`npm install`, `npm run validate`)

### Helpful

- **Experience with SSE/NDJSON**: For streaming implementations
- **Knowledge of JSONPath**: For event mapping (simple syntax, easy to learn)
- **Understanding of APIs**: REST endpoints, authentication, streaming

---

## Understanding Provider Manifests

### Structure Overview

A provider manifest contains:

| Section | Purpose | Required |
|---------|---------|----------|
| `id` | Unique provider identifier | ✅ |
| `protocol_version` | AI-Protocol version used | ✅ |
| `endpoint` | API base URL and protocol | ✅ |
| `auth` | Authentication method | ✅ |
| `streaming` | Streaming configuration | ⚠️ (if streaming supported) |
| `parameter_mappings` | API parameter mapping | ✅ |
| `capabilities` | Supported features | ✅ |
| `error_classification` | Error type mapping | ⚠️ (recommended) |
| `retry_policy` | Retry configuration | ⚠️ (recommended) |

### Minimal Provider Manifest

```yaml
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/v0.4.0/schemas/v1.json"

id: my-provider
protocol_version: "1.5"

endpoint:
  base_url: "https://api.my-provider.com/v1"
  protocol: "https"

auth:
  type: bearer
  token_env: "MY_PROVIDER_API_KEY"

parameter_mappings:
  temperature: "temperature"
  max_tokens: "max_completion_tokens"  # Provider-specific parameter name

capabilities:
  chat: true
  streaming: true
  tools: false
  vision: false
```

---

## Step-by-Step Guide

### Step 1: Research the Provider

Before creating the manifest:

1. **Get API Access**: Sign up for developer account
2. **Read Documentation**: Understand:
   - Authentication method (API keys, OAuth, etc.)
   - Base URL and endpoints
   - Request/response format
   - Streaming support (SSE, NDJSON, etc.)
   - Error handling and HTTP status codes
3. **Test with cURL/Postman**: Verify basic API functionality
4. **Identify Capabilities**:
   - [ ] Chat completion
   - [ ] Streaming responses
   - [ ] Function/tool calling
   - [ ] Vision (image input)
   - [ ] Other features

### Step 2: Create the Provider Manifest File

Create `v1/providers/my-provider.yaml`:

```bash
# From ai-protocol root
touch v1/providers/my-provider.yaml
```

Start with the template:

```yaml
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/main/schemas/v1.json"

id: my-provider
protocol_version: "1.5"

version: "v1"

endpoint:
  # TODO: Set correct base URL
  base_url: "https://api.my-provider.com/v1"
  protocol: "https"

  # Optional: Specific endpoint family to avoid confusion
  api_families:
    - id: "chat"
      name: "Chat Completions"
      purpose: "Text generation"

auth:
  # Common types: bearer, api_key, oauth2, basic
  type: bearer
  token_env: "MY_PROVIDER_API_KEY"

  # Optional: Extra headers
  extra_headers:
    - name: "User-Agent"
      value: "ai-protocol"

parameter_mappings:
  # Map standard parameters to provider-specific names
  # Key: AI-Protocol standard name
  # Value: Provider's parameter name
  temperature: "temperature"
  max_tokens: "max_tokens"
  stream: "stream"
  messages: "messages"
  model: "model"

capabilities:
  # Supported features
  chat: true
  streaming: true      # Update after testing
  tools: false         # Update if supported
  vision: false        # Update if supported
  multimodal: false
  agentic: false
  reasoning: false
```

### Step 3: Configure Authentication

**Bearer Token (most common)**:
```yaml
auth:
  type: bearer
  token_env: "MY_PROVIDER_API_KEY"
```

**API Key in Header**:
```yaml
auth:
  type: api_key
  key_env: "MY_PROVIDER_API_KEY"
  header_name: "X-API-Key"
```

**OAuth 2.0**:
```yaml
auth:
  type: oauth2
  token_env: "MY_PROVIDER_OAUTH_TOKEN"
```

**Basic Auth**:
```yaml
auth:
  type: basic
  username_env: "MY_PROVIDER_USERNAME"
  password_env: "MY_PROVIDER_PASSWORD"
```

### Step 4: Configure Streaming (if supported)

#### SSE (Server-Sent Events)

```yaml
streaming:
  decoder:
    format: "sse"
    strategy: "simple"
    delimiter: "\n\n"
    prefix: "data: "

  # JSONPath selector for relevant frames
  frame_selector: "$.type in ['delta', 'done']"

  event_map:
    # Extract text content
    - match: "$.type == 'delta' && has("$.text")"
      emit: "PartialContentDelta"
      extract:
        content: "$.text"

    # Stream end
    - match: "$.type == 'done'"
      emit: "StreamEnd"
      extract:
        finish_reason: "$.reason"
```

#### NDJSON (Newline-Delimited JSON)

```yaml
streaming:
  decoder:
    format: "ndjson"
    strategy: "simple"

  frame_selector: "$.has_delta"

  event_map:
    - match: "$.has_delta == true"
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.content"

    - match: "$.done == true"
      emit: "StreamEnd"
      extract:
        finish_reason: "$.finish_reason"
```

#### Provider-Specific SSE (e.g., OpenAI)

```yaml
streaming:
  decoder:
    format: "openai_sse"
    strategy: "openai_event_stream"

  event_map:
    - match: "$.type == 'content_block_delta'"
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"
```

### Step 5: Configure Error Classification

Map provider errors to AI-Protocol standard errors:

```yaml
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "403": "authentication"
    "429": "rate_limited"
    "500": "server_error"
    "502": "server_error"
    "503": "server_error"
    "504": "timeout"

  # Optional: Parse error body for specific types
  by_error_code:
    "context_length_exceeded": "context_length_exceeded"
    "quota_exceeded": "quota_exceeded"
    "invalid_api_key": "authentication"

  # Optional: Error message contains keyword
  by_message_contains:
    "rate limit": "rate_limited"
    "quota": "quota_exceeded"
    "timeout": "timeout"
```

### Step 6: Configure Retry Policy

```yaml
retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"  # or "none" or "partial"
  max_retries: 3
  retry_on_http_status: [429, 500, 502, 503, 504]
  retry_on_error: ["rate_limited", "server_error", "timeout"]

  notes:
    - "429 may be rate limit or quota exhaustion"
```

### Step 7: Validate the Manifest

```bash
# From ai-protocol root
npm install  # Only needed on first run
npm run validate:providers
```

Fix any validation errors before proceeding.

### Step 8: Add Model Registry (Optional but Recommended)

Create `v1/models/my-provider-models.yaml`:

```yaml
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/main/schemas/v1.json"

models:
  my-model-v1:
    provider: my-provider
    model_id: "my-model-v1"  # Actual model ID used in API calls
    context_window: 128000
    capabilities: [chat, streaming]
    pricing:
      input_per_token: 0.000001
      output_per_token: 0.000002

  my-model-v2:
    provider: my-provider
    model_id: "my-model-v2"
    context_window: 200000
    capabilities: [chat, streaming, tools]
    pricing:
      input_per_token: 0.000002
      output_per_token: 0.000003
```

---

## Provider Manifest Reference

### Complete Example

```yaml
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/main/schemas/v1.json"

# Metadata
id: my-provider
protocol_version: "1.5"
version: "v1"

# API Endpoint
endpoint:
  base_url: "https://api.my-provider.com/v1"
  protocol: "https"

  # Optional: API family declaration
  api_families:
    - id: "chat"
      name: "Chat Completions"
      purpose: "Text generation"

# Authentication
auth:
  type: bearer
  token_env: "MY_PROVIDER_API_KEY"

  # Optional: Support fallback to alternative auth methods
  # extra_headers:
  #   - name: "X-Client-Version"
  #     value: "1.0.0"

# Availability Check (optional but recommended)
availability:
  required: false
  regions: ["global"]
  check:
    method: "GET"
    path: "/models"
    expected_status: [200]

# Parameter Mappings
parameter_mappings:
  # Standard parameters
  temperature: "temperature"
  max_tokens: "max_tokens"
  top_p: "top_p"
  top_k: "top_k"
  stream: "stream"
  stop_sequences: "stop"
  tool_choice: "tool_choice"

  # Provider-specific parameters
  my_custom_param: "custom_parameter"

# Streaming Configuration (if supported)
streaming:
  # Decoder configuration
  decoder:
    format: "sse"
    strategy: "simple"
    delimiter: "\n\n"
    prefix: "data: "

  # Frame selector (JSONPath expression)
  frame_selector: "$.type in ['content', 'error', 'done']"

  # Event mapping
  event_map:
    # Content delta
    - match: "$.type == 'content' && has('text')"
      emit: "PartialContentDelta"
      extract:
        content: "$.text"

    # Tool call start
    - match: "$.type == 'tool_call_start'"
      emit: "ToolCallStarted"
      extract:
        tool_call_id: "$.id"
        tool_name: "$.name"

    # Tool call delta
    - match: "$.type == 'tool_call_delta'"
      emit: "ToolCallDelta"
      extract:
        arguments: "$.args"

    # Stream end
    - match: "$.type == 'done'"
      emit: "StreamEnd"
      extract:
        finish_reason: "$.reason"

    # Error
    - match: "$.type == 'error'"
      emit: "StreamError"
      extract:
        error_message: "$.message"
        error_code: "$.code"

# Capabilities
capabilities:
  chat: true
  streaming: true
  tools: false
  vision: false
  multimodal: false
  agentic: false
  reasoning: false

# Error Classification
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "403": "authentication"
    "404": "invalid_request"
    "429": "rate_limited"
    "500": "server_error"
    "502": "server_error"
    "503": "server_error"
    "504": "timeout"

  by_error_code:
    "context_length_exceeded": "context_length_exceeded"
    "rate_limit_exceeded": "rate_limited"

  by_message_contains:
    "quota": "quota_exceeded"
    "timeout": "timeout"

# Retry Policy
retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"
  max_retries: 3
  retry_on_http_status: [429, 500, 502, 503, 504]

  notes:
    - "Provider-specific retry recommendations"

# Rate Limiting (optional)
rate_limit_headers:
  requests_limit: "X-RateLimit-Limit"
  requests_remaining: "X-RateLimit-Remaining"
  requests_reset: "X-RateLimit-Reset"
  retry_after: "Retry-After"

# Termination Reasons
termination_reasons:
  stop: "stop"
  length: "length"
  tool_calls: "tool_calls"
  error: "error"
```

---

## Validation and Testing

### 1. Schema Validation

```bash
npm run validate:providers
```

Check for:
- Invalid keys or values
- Missing required fields
- Type mismatches

### 2. Manual Testing with API

Test your configuration against the actual provider API:

```bash
# Set environment variables
export MY_PROVIDER_API_KEY="your-api-key"

# Make a test request with curl
curl -X POST "https://api.my-provider.com/v1/chat/completions" \
  -H "Authorization: Bearer $MY_PROVIDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-model",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 10
  }'
```

### 3. Test with Runtime

**Python**:
```python
import asyncio
from ai_lib_python import AiClient

async def test():
    client = await AiClient.create("my-provider/my-model")
    response = await client.chat().user("Test").execute()
    print(response.content)
    await client.close()

asyncio.run(test())
```

**Rust**:
```rust
use ai_lib_rust::{AiClient, Message};

#[tokio::main]
async fn main() -> ai_lib_rust::Result<()> {
    let client = AiClient::new("my-provider/my-model").await?;
    let response = client.chat()
        .messages(vec![Message::user("Test")])
        .execute().await?;
    println!("{}", response.content);
    Ok(())
}
```

### 4. Add Supporting Documentation (Optional)

Create `research/providers/my-provider.md` with:
- API behavior notes
- Known issues or quirks
- Performance characteristics
- Validation checklist

---

## Model Registration

### Model Registry Format

```yaml
models:
  model-name:
    provider: provider-id  # Must match provider manifest id
    model_id: "actual-model-id"  # Exact ID used in API
    context_window: 128000  # Maximum context size
    capabilities: [chat, vision, tools, streaming]  # Supported features
    pricing:
      input_per_token: 0.000001  # Price per 1K input tokens
      output_per_token: 0.000002  # Price per 1K output tokens
```

### Finding Model Information

1. **From Provider Docs**: Check official model documentation
2. **From API**: Call `/models` endpoint if available
3. **From Pricing Docs**: Check pricing pages for token costs

### Verification

Add verification metadata (optional but recommended):

```yaml
models:
  my-model:
    provider: my-provider
    model_id: "my-model-v1"
    context_window: 128000
    capabilities: [chat, streaming]
    pricing:
      input_per_token: 0.000001
      output_per_token: 0.000002

    # Optional verification meta
    verification:
      status: "verified"
      verified_at: "2026-02-05"
      source: "official_documentation"
      notes: "Tested with API endpoints /v1/chat/completions"
```

---

## Best Practices

### 1. Start Simple

Begin with basic chat completion before adding:
- Streaming
- Tool calling
- Vision
- Advanced features

### 2. Use Real API Data

Base your manifest on actual API responses, not assumptions.

### 3. Test Edge Cases

Test:
- Empty inputs
- Very long inputs (approaching context limit)
- Invalid model names
- Network errors
- Rate limits

### 4. Document Provider-Specific Behavior

Add notes in `research/providers/` for:
- Non-standard behavior
- Quirks or workarounds
- Known bugs

### 5. Follow Naming Conventions

- Provider ID: `lowercase-hyphens` (e.g., `my-provider`)
- Model names: `lowercase-hyphens` (e.g., `my-model-v1`)

### 6. Provide Multiple Models

Register at least 2-3 models to demonstrate flexibility.

---

## Common Patterns

### Pattern 1: OpenAI-Compatible API

Many providers follow OpenAI's API format:

```yaml
streaming:
  decoder:
    format: "openai_sse"
  event_map:
    - match: "$.type == 'content_block_delta'"
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"
```

### Pattern 2: Anthropic-Compatible API

```yaml
streaming:
  decoder:
    format: "anthropic_sse"
  event_map:
    - match: "$.type == 'content_block_delta'"
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"
```

### Pattern 3: Custom SSE Format

If your provider uses a custom SSE format:

```yaml
streaming:
  decoder:
    format: "sse"
    strategy: "simple"
    delimiter: "\n"
    custom_parser: true  # Note runtime support needed
```

### Pattern 4: Tool Calling

```yaml
streaming:
  event_map:
    - match: "$.type == 'tool_call_start'"
      emit: "ToolCallStarted"
      extract:
        tool_call_id: "$.id"
        tool_name: "$.name"
```

### Pattern 5: Multi-Region Endpoints

```yaml
endpoint:
  base_url: "https://api.my-provider.com/v1"
  regions:
    - id: "us-east"
      base_url: "https://us-east.api.my-provider.com/v1"
    - id: "eu-west"
      base_url: "https://eu-west.api.my-provider.com/v1"
```

---

## Submitting Your Contribution

### 1. Create a Pull Request

```bash
# From ai-protocol root
git checkout -b add-my-provider
git add v1/providers/my-provider.yaml
git commit -m "Add my-provider support"
git push origin add-my-provider
```

### 2. PR Checklist

Include in your PR:

- [ ] Provider manifest in `v1/providers/`
- [ ] Model registry in `v1/models/` (if applicable)
- [ ] Validation passes: `npm run validate`
- [ ] Manual testing completed
- [ ] Documentation (optional): Added note in `research/providers/`
- [ ] Update README: Add provider to provider list
- [ ] Update CHANGELOG: Add entry for new provider

### 3. PR Description Template

```markdown
## Summary

Add support for [Provider Name] to AI-Protocol.

## Changes

- Added `v1/providers/my-provider.yaml`
- Added `v1/models/my-provider-models.yaml`
- Updated README with provider information

## Testing

- ✅ Schema validation passes
- ✅ Manual API testing completed
- ✅ Tested with ai-lib-python (and/or ai-lib-rust)

## Notes

- [Any provider-specific notes or limitations]
- [Features not yet supported]
```

---

## Getting Help

### Consult Existing Providers

Review similar provider manifests as examples:
- [`v1/providers/openai.yaml`](https://github.com/ailib-official/ai-protocol/blob/main/v1/providers/openai.yaml)
- [`v1/providers/anthropic.yaml`](https://github.com/ailib-official/ai-protocol/blob/main/v1/providers/anthropic.yaml)
- [`v1/providers/gemini.yaml`](https://github.com/ailib-official/ai-protocol/blob/main/v1/providers/gemini.yaml)

### Ask in Issues

If you encounter issues:

1. Search existing [GitHub Issues](https://github.com/ailib-official/ai-protocol/issues)
2. Create a new issue with:
   - Provider name
   - Problem description
   - relevant error messages
   - Minimal example

### JSONPath Reference

Basic JSONPath syntax:

| Expression | Description | Example |
|------------|-------------|---------|
| `$.field` | Field access | `$.message` |
| `$.array[*]` | All array elements | `$.choices[*]` |
| `$["key"]` | Quoted key access | `$["response"]` |
| `has("field")` | Check field existence | `has("$.text")` |
| `in [...]` | Value in array | `$.type in ['delta', 'done']` |
| `&&`, `\\|\\|` | Logical operators | `$.done == true && has("$.reason")` |

---

## Appendix: Quick Reference

### Common Authentication Types

| Type | Usage | Example |
|------|-------|---------|
| `bearer` | Bearer token in Authorization header | Anthropic, OpenAI |
| `api_key` | API key in custom header | Custom providers |
| `oauth2` | OAuth2 Bearer token | Some enterprise providers |
| `basic` | HTTP Basic Auth | Legacy APIs |

### Error Classification Priority

1. **by_error_code** (highest priority)
2. **by_message_contains**
3. **by_http_status** (fallback)

### Streaming Formats

| Format | Description | Usage |
|--------|-------------|-------|
| `sse` | Standard Server-Sent Events | Custom SSE |
| `openai_sse` | OpenAI-specific SSE | OpenAI-compatible APIs |
| `anthropic_sse` | Anthropic-specific SSE | Anthropic APIs |
| `ndjson` | Newline-delimited JSON | Some providers |

---

**Last Updated**: 2026-02-05 | **Version**: v0.4.0

Ready to contribute? Start by picking a provider and creating your first manifest!
