# V2 Protocol Architecture Design

> **Status**: Draft  
> **Version**: 0.1  
> **Date**: 2026-02-14  
> **Task ID**: S2.1

## 1. Overview

AI-Protocol V2 introduces a **Three-Layer Pyramid Architecture** that provides clear separation
of concerns, enabling progressive adoption and capability-based loading.

### Design Principles

1. **Manifest-first**: All behavior is defined through declarative manifests; runtimes interpret and execute.
2. **Provider-agnostic**: The protocol layer contains no vendor-specific concepts.
3. **Progressive decoupling**: Start simple, introduce complexity incrementally.
4. **Capability-based loading**: Runtimes only load declared capability modules.
5. **Cross-runtime consistency**: Behavior is verified through the compliance test suite.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    V2 Three-Layer Pyramid                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L3: Environment Profile                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Provider API Key / Endpoint / Retry Policy         │    │
│  │  Runtime parameters / Deployment configuration      │    │
│  │  → Changes per deployment, not per protocol update  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ▲                                 │
│  L2: Capability Extensions                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  capabilities: [text, vision, tool_call, ...]       │    │
│  │  context_policy / guardrails / routing              │    │
│  │  Loaded on demand; controlled by Feature Flags      │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ▲                                 │
│  L1: Core Protocol (minimal and stable)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Message format / Standard error codes              │    │
│  │  Basic metadata / Version declaration               │    │
│  │  ⚠ Extremely low change frequency; backward compat  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Definitions

### 2.1 L1: Core Protocol Layer

The Core layer defines the **absolute minimum** required for any AI-Protocol interaction.
It is designed to be extremely stable and backward-compatible.

#### 2.1.1 Scope

| Component | Description | Schema |
|-----------|-------------|--------|
| **Message Format** | Standardized message structure: role, content, metadata | `schemas/v2/message.json` |
| **Error Codes** | Unified error code system across all providers | `schemas/v2/errors.json` |
| **Version Declaration** | Protocol version and compatibility metadata | Part of manifest root |
| **Basic Metadata** | Provider ID, name, status, protocol_version | Part of manifest root |

#### 2.1.2 Message Format (L1)

```yaml
# Core message structure — all runtimes MUST support this
message:
  role: "user" | "assistant" | "system" | "tool"
  content: string | ContentBlock[]
  metadata:
    message_id: string?       # Optional unique ID
    timestamp: string?        # ISO 8601
```

#### 2.1.3 Standard Error Codes (L1)

Every runtime MUST map provider-specific errors to these standard error codes:

| Code | Name | HTTP Status | Retryable | Fallbackable | Description |
|------|------|-------------|-----------|--------------|-------------|
| `E1001` | `invalid_request` | 400 | No | No | Malformed request parameters |
| `E1002` | `authentication` | 401 | No | Yes | Invalid or missing API key |
| `E1003` | `permission_denied` | 403 | No | No | Insufficient permissions |
| `E1004` | `not_found` | 404 | No | No | Resource not found |
| `E1005` | `request_too_large` | 413 | No | No | Payload exceeds limit |
| `E2001` | `rate_limited` | 429 | Yes | Yes | Rate limit exceeded |
| `E2002` | `quota_exhausted` | 429 | No | Yes | Usage quota depleted |
| `E3001` | `server_error` | 500 | Yes | Yes | Internal server error |
| `E3002` | `overloaded` | 503 | Yes | Yes | Service temporarily overloaded |
| `E3003` | `timeout` | 504/timeout | Yes | Yes | Request timeout |
| `E4001` | `conflict` | 409 | Yes | No | State conflict |
| `E4002` | `cancelled` | N/A | No | No | Request cancelled by client |
| `E9999` | `unknown` | varies | No | No | Unclassified error |

#### 2.1.4 Version Declaration (L1)

```yaml
# Manifest root — L1 required fields
id: "anthropic"                    # Provider identifier
protocol_version: "2.0"           # V2 protocol version
spec_version: "2.0"               # Schema version
status: "stable"                   # stable | beta | deprecated
```

#### 2.1.5 Stability Contract

- L1 fields MUST NOT be removed in any 2.x release.
- L1 fields MAY be extended with optional properties.
- Breaking changes to L1 require a major version bump (v3.0).

---

### 2.2 L2: Capability Extensions Layer

The Extensions layer defines **optional capabilities** that providers may support.
Runtimes load only the capabilities declared in the manifest.

#### 2.2.1 Capability Declaration

Each provider manifest declares its supported capabilities:

```yaml
# L2: Capability declarations
capabilities:
  required:
    - text           # Basic text chat (always required for chat providers)
  optional:
    - streaming      # Server-sent event streaming
    - vision         # Image input support
    - audio          # Audio input/output
    - tools          # Function/tool calling
    - parallel_tools # Parallel tool invocations
    - agentic        # Multi-turn agent reasoning
    - reasoning      # Extended thinking/chain-of-thought
    - embeddings     # Embedding generation
    - structured_output  # JSON mode / schema-constrained output
    - batch          # Batch request API
```

#### 2.2.2 Capability Modules

Each capability maps to a self-contained module in the protocol:

| Capability | Protocol Module | Feature Flag (Rust) | Extra (Python) |
|------------|----------------|---------------------|----------------|
| `text` | Core (always loaded) | default | default |
| `streaming` | `streaming.*` | default | default |
| `vision` | `multimodal.vision` | `vision` | `[vision]` |
| `audio` | `multimodal.audio` | `audio` | `[audio]` |
| `tools` | `tools.*` | default | default |
| `embeddings` | `embeddings.*` | `embeddings` | `[embeddings]` |
| `structured_output` | `structured.*` | `structured` | `[structured]` |
| `batch` | `batch.*` | `batch` | `[batch]` |
| `agentic` | `agentic.*` | `agentic` | `[agentic]` |

#### 2.2.3 Extension Modules

Beyond capabilities, L2 also defines these cross-cutting extensions:

**Streaming Configuration**

```yaml
streaming:
  decoder:
    format: "sse" | "ndjson" | "anthropic_sse" | "gemini_sse"
    strategy: string
  event_map:
    - match: "JSONPath expression"
      emit: "StandardEvent"
      extract:
        content: "JSONPath"
  candidate:
    candidate_id_path: "JSONPath"
    fan_out: boolean
  accumulator:
    stateful_tool_parsing: boolean
    key_path: "JSONPath"
    flush_on: "JSONPath condition"
```

**Error Classification**

```yaml
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "429": "rate_limited"
    "500": "server_error"
  by_error_code:
    "context_length_exceeded": "request_too_large"
    "model_not_found": "not_found"
```

**Retry Policy**

```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full" | "equal" | "none"
  retry_on_http_status: [429, 500, 502, 503]
  retry_on_error_code: ["rate_limited", "server_error", "overloaded"]
```

**Rate Limit Headers**

```yaml
rate_limit_headers:
  requests_limit: "x-ratelimit-limit-requests"
  requests_remaining: "x-ratelimit-remaining-requests"
  tokens_limit: "x-ratelimit-limit-tokens"
  tokens_remaining: "x-ratelimit-remaining-tokens"
  retry_after: "retry-after"
```

**Guardrails**

```yaml
guardrails:
  input_filters:
    - type: "content_safety"
      action: "block" | "warn" | "log"
    - type: "pii_detection"
      action: "mask" | "block"
  output_filters:
    - type: "content_safety"
      action: "block" | "warn"
```

#### 2.2.4 Extensibility Contract

- New capabilities MAY be added in any 2.x release.
- Existing capability schemas MUST remain backward-compatible.
- Runtimes MUST ignore unknown capabilities gracefully.

---

### 2.3 L3: Environment Profile Layer

The Environment layer captures **deployment-specific configuration** that varies
between environments (dev, staging, production) but is not part of the protocol itself.

#### 2.3.1 Scope

| Component | Description |
|-----------|-------------|
| **API Keys** | Provider authentication credentials |
| **Endpoints** | Base URLs and service endpoints |
| **Proxy** | HTTP proxy configuration |
| **Timeouts** | Connection and request timeouts |
| **Resource Limits** | Max in-flight, rate limits, circuit breaker |
| **Deployment Mode** | Development, staging, production flags |

#### 2.3.2 Configuration Sources (Priority Order)

1. **Programmatic** — set via builder/constructor API
2. **Environment Variables** — `AI_PROTOCOL_*`, `<PROVIDER>_API_KEY`
3. **Profile File** — `ai-protocol.env.yaml` (optional)
4. **Defaults** — sensible built-in defaults

#### 2.3.3 Environment Profile (Optional)

```yaml
# ai-protocol.env.yaml (NOT committed to source control)
environment: "production"

providers:
  openai:
    api_key: "${OPENAI_API_KEY}"
    endpoint: "https://api.openai.com/v1"
    timeout_ms: 30000
    max_retries: 3

  anthropic:
    api_key: "${ANTHROPIC_API_KEY}"
    endpoint: "https://api.anthropic.com"
    timeout_ms: 60000

defaults:
  max_inflight: 10
  rate_limit_rps: 50
  circuit_breaker:
    failure_threshold: 5
    cooldown_seconds: 30
```

#### 2.3.4 Isolation Contract

- L3 configuration MUST NOT affect protocol semantics.
- L3 values MUST NOT be embedded in protocol manifests.
- L3 is runtime-specific and may differ between Rust and Python.

---

## 3. Concentric Circle Manifest Structure

The V2 manifest follows a "concentric circle" model where each ring builds upon the inner one:

```
┌─────────────────────────────────────────────────┐
│  Ring 3: Advanced Extensions                     │
│  ┌───────────────────────────────────────────┐   │
│  │  Ring 2: Capability Mapping               │   │
│  │  ┌───────────────────────────────────┐    │   │
│  │  │  Ring 1: Core Skeleton            │    │   │
│  │  │                                   │    │   │
│  │  │  id, protocol_version, endpoint,  │    │   │
│  │  │  error_classification             │    │   │
│  │  └───────────────────────────────────┘    │   │
│  │                                           │   │
│  │  capabilities, streaming, parameters,     │   │
│  │  tools, multimodal                        │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│  guardrails, routing, context_policy,            │
│  telemetry, batch, plugins                       │
└─────────────────────────────────────────────────┘
```

### 3.1 Ring 1: Core Skeleton (Required)

Every V2 manifest MUST contain:

```yaml
id: "provider-id"
protocol_version: "2.0"
endpoint:
  base_url: "https://api.example.com"
  chat: "/v1/chat/completions"
  auth:
    type: "bearer"
    header: "Authorization"
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "429": "rate_limited"
    "500": "server_error"
```

### 3.2 Ring 2: Capability Mapping (Conditional)

Present when provider supports the corresponding capability:

```yaml
capabilities:
  required: [text, streaming]
  optional: [vision, tools, parallel_tools]

streaming:
  decoder: { format: "sse", strategy: "openai_chat" }
  event_map: [...]

parameters:
  temperature: { type: float, range: [0.0, 2.0] }
  max_tokens: { type: integer, min: 1 }
```

### 3.3 Ring 3: Advanced Extensions (Optional)

Present only when advanced features are needed:

```yaml
guardrails:
  input_filters: [...]
  output_filters: [...]

rate_limit_headers:
  requests_limit: "x-ratelimit-limit-requests"

retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
```

---

## 4. Feature Flag Mechanism

### 4.1 Protocol-Level Feature Flags

The V2 protocol defines standard feature flags that runtimes honor:

```yaml
# In provider manifest
features:
  structured_output: true       # Enable JSON mode support
  parallel_tool_calls: true     # Enable parallel tool invocations
  extended_thinking: false      # Disable thinking blocks by default
  streaming_usage: true         # Enable streaming token usage reporting
```

### 4.2 Runtime Feature Flags

#### Rust (Cargo Features)

```toml
[features]
default = []

# Capability-based features
vision = []
audio = []
embeddings = []
structured = []
batch = []
agentic = []

# Infrastructure features
routing_mvp = []
interceptors = []
telemetry = ["dep:opentelemetry"]
```

#### Python (Extras)

```toml
[project.optional-dependencies]
vision = ["pillow>=10.0"]
audio = ["soundfile>=0.12"]
embeddings = []
structured = []
batch = []
agentic = []
telemetry = ["opentelemetry-api>=1.20", "opentelemetry-sdk>=1.20"]
tokenizer = ["tiktoken>=0.5"]
full = ["ai-lib-python[vision,audio,embeddings,structured,batch,agentic,telemetry,tokenizer]"]
```

### 4.3 Feature Flag Resolution

```
Protocol Manifest declares capabilities
          │
          ▼
Runtime checks feature flags
          │
          ├── Feature enabled? → Load module
          │
          └── Feature disabled? → Skip module, return clear error if called
```

---

## 5. Cross-Runtime Consistency

### 5.1 Mandatory Behaviors (MUST be identical)

| Behavior | Description |
|----------|-------------|
| Error code mapping | Same HTTP status → same standard error code |
| Streaming event types | Same provider frame → same `StreamingEvent` variant |
| Tool call assembly | Same partial tool call chunks → same assembled result |
| Parameter normalization | Same standard params → same provider-specific params |
| Protocol validation | Same manifest → same validation result (pass/fail) |

### 5.2 Allowed Differences

| Aspect | Description |
|--------|-------------|
| Async model | Rust uses `async/await` + `Stream`; Python uses `async for` |
| Error type hierarchy | Language-specific error class design |
| Configuration API | Builder patterns may differ |
| Performance characteristics | Expected to differ |
| Memory management | Ownership vs GC |

### 5.3 Compliance Test Suite

Cross-runtime consistency is verified by the **compliance test suite** (`tests/compliance/`).
See [Compliance Test Suite Design](../tests/compliance/README.md) for details.

---

## 6. Migration Path from V1

### 6.1 V1 to V2 Mapping

| V1 Concept | V2 Equivalent | Notes |
|------------|---------------|-------|
| `protocol_version: "1.5"` | `protocol_version: "2.0"` | Version bump |
| `capabilities: [list]` | `capabilities: { required: [...], optional: [...] }` | Structured declaration |
| `error_classification` | Unchanged, extended with standard error codes | Backward compatible |
| `streaming` | Unchanged structure, new event types added | Backward compatible |
| `parameters` (in spec.yaml) | Moved to per-provider or shared definitions | More flexibility |

### 6.2 Compatibility Strategy

- V2 runtimes MUST continue to support V1 manifests.
- V1 manifests are automatically "promoted" to V2 with defaults.
- Runtimes detect version from `protocol_version` field.

---

## 7. Schema File Organization

```
schemas/
├── v1.json                    # V1 provider/model schema (stable)
├── spec.json                  # Spec file schema (stable)
└── v2/                        # V2 schema collection
    ├── provider.json          # V2 provider manifest schema (Ring 1-3)
    ├── capabilities.json      # Capability declaration schema
    ├── errors.json            # Standard error code definitions
    ├── endpoint.json          # Endpoint configuration schema
    ├── availability.json      # Availability configuration schema
    ├── regions.json           # Region configuration schema
    ├── message.json           # Standard message format (future)
    └── feature-flags.json     # Feature flag schema (future)
```

---

## 8. Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Three-layer pyramid | Clear separation; progressive adoption | Flat schema, microkernel |
| Standard error codes with numeric prefix | Sortable, groupable (1xxx=client, 2xxx=rate, 3xxx=server) | String-only codes |
| Concentric circle manifest | Validates at each ring; minimal manifests are valid | Flat required fields |
| Feature flags in both protocol and runtime | Protocol flags = portable; runtime flags = compile-time optimization | Runtime-only flags |
| V1 backward compatibility | Large existing user base; migration must be gradual | Breaking change |

---

## Appendix A: Provider Manifest Template (V2)

```yaml
# V2 Provider Manifest Template
$schema: "https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v2/provider.json"

# === Ring 1: Core Skeleton (Required) ===
id: "example-provider"
protocol_version: "2.0"
name: "Example Provider"
status: "stable"

endpoint:
  base_url: "https://api.example.com"
  chat: "/v1/chat/completions"
  auth:
    type: "bearer"
    header: "Authorization"
    prefix: "Bearer"

error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "403": "permission_denied"
    "404": "not_found"
    "429": "rate_limited"
    "500": "server_error"
    "503": "overloaded"

# === Ring 2: Capability Mapping (Conditional) ===
capabilities:
  required: [text, streaming]
  optional: [vision, tools]

streaming:
  decoder:
    format: "sse"
    strategy: "openai_chat"
  event_map:
    - match: "$.choices[0].delta.content"
      emit: "PartialContentDelta"
      extract:
        content: "$.choices[0].delta.content"
    - match: "$.choices[0].finish_reason"
      emit: "StreamEnd"
      extract:
        finish_reason: "$.choices[0].finish_reason"

# === Ring 3: Advanced Extensions (Optional) ===
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  jitter: "full"
  retry_on_http_status: [429, 500, 502, 503]

rate_limit_headers:
  requests_limit: "x-ratelimit-limit-requests"
  requests_remaining: "x-ratelimit-remaining-requests"
```

---

**End of Document**
