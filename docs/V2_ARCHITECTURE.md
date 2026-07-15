# V2 Protocol Architecture Design

> **Status**: Finalized (hygiene pass PT-ARCH-006 / F6)  
> **Version**: 1.0  
> **Date**: 2026-02-16  
> **Updated**: 2026-07-15 — fix dangling schema links; cross-link authority docs  
> **Task ID**: S3.8 (v1.0 定稿：包含 ProviderContract、ProviderDriver 架构、Context Policy、完整能力体系)

**Normative companions (Architecture Workstream)**

- [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md) — v1 LTS wire vs v2 evolution tip  
- [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) — Capability / Execution / Policy Spec  
- [`PROVIDER_IDENTITY.md`](./PROVIDER_IDENTITY.md) — canonical `gemini` + alias `google`  
- [`CONTEXT_ENVELOPE.md`](./CONTEXT_ENVELOPE.md) — Experimental Envelope / Layer (PT-ARCH-003)  

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
| **Message roles** | Canonical chat roles (`user` / `assistant` / `system` / `tool`) | [`schemas/v2/message-roles.json`](../schemas/v2/message-roles.json) |
| **Context envelope** (Experimental) | Layered chunks / budget assembly catch-up | [`schemas/v2/context-envelope.json`](../schemas/v2/context-envelope.json) — see [`CONTEXT_ENVELOPE.md`](./CONTEXT_ENVELOPE.md) |
| **Error Codes** | Unified error code system across all providers | [`schemas/v2/errors.json`](../schemas/v2/errors.json) |
| **Version Declaration** | Protocol version and compatibility metadata | Part of manifest root |
| **Basic Metadata** | Provider ID, name, status, protocol_version | Part of manifest root |

> **Note (PT-ARCH-006 / F6):** There is **no** `schemas/v2/message.json`. Earlier drafts referred to a monolithic message schema that was never published. Use **message-roles** for roles and **context-envelope** (Experimental) for layered assembly. Wire message *content* encoding follows provider contracts (`schemas/v2/provider-contract.json`).

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
| `computer_use` | `computer_use.*` | `computer_use` | `[computer_use]` |
| `mcp_client` | `mcp.client` | `mcp` | `[mcp]` |
| `mcp_server` | `mcp.server` | `mcp` | `[mcp]` |

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

## 7. MCP Integration (V2 Addition)

AI-Protocol V2 standardizes integration with the **Model Context Protocol (MCP)**, the open
protocol (spec version 2025-11-25) for connecting LLMs to external tools and data sources.

### 7.1 MCP in the Capability Model

MCP support is declared as optional capabilities in Ring 2:

```yaml
capabilities:
  optional:
    - mcp_client      # Connect to external MCP servers
    - mcp_server      # Expose capabilities via MCP

mcp:
  client:
    supported: true
    protocol_version: "2025-11-25"
    transports: [stdio, sse, streamable_http]
    capabilities:
      tools: true
      resources: true
      prompts: false
      sampling: false
  server:
    supported: false
```

### 7.2 Provider MCP Support Matrix (Feb 2026)

| Provider | MCP Client | MCP Server | Transport | Notes |
|----------|-----------|------------|-----------|-------|
| **Anthropic** | ✅ API connector | — | SSE | MCP creator; beta header `mcp-client-2025-11-20` |
| **OpenAI** | ✅ Responses API | ✅ Docs MCP | Streamable HTTP | Built-in `mcp` tool type |
| **Google** | ✅ Gemini CLI | ✅ Official servers | Stdio/SSE/HTTP | Google Maps, BigQuery, Firebase servers |
| **Moonshot** | ❌ | ❌ | — | Not yet supported |
| **Zhipu** | ❌ | ❌ | — | Not yet supported |
| **DeepSeek** | ❌ | ❌ | — | Not yet supported |

### 7.3 MCP Schema

See `schemas/v2/mcp.json` for the full JSON Schema definition.

---

## 8. Computer Use Abstraction (V2 Addition)

V2 standardizes computer use / GUI automation across providers with different implementations.

### 8.1 Implementation Approaches

| Provider | Approach | Tool Type | Status |
|----------|---------|-----------|--------|
| **Anthropic** | Screen-based (screenshot loop) | `computer_20251124` | Beta |
| **OpenAI** | CUA model (screenshot loop) | `computer_use_preview` | Preview |
| **Google** | Tool-based (structured actions) | `computer_use` config | GA |

### 8.2 Standardized Actions

All implementations are normalized to a common action set:

```yaml
computer_use:
  supported: true
  status: beta
  implementation: screen_based
  actions:
    screenshot: { supported: true }
    mouse: { supported: true, operations: [click, double_click, drag, scroll] }
    keyboard: { supported: true, operations: [type, key_press, shortcut] }
    browser: { supported: true, operations: [navigate, fill_form] }
  safety:
    confirmation_required: true
    sandbox_mode: recommended
```

### 8.3 Computer Use Schema

See `schemas/v2/computer-use.json` for the full JSON Schema definition.

---

## 9. Extended Multimodal Model (V2 Addition)

V2 extends the multimodal capability declaration to cover input/output modalities,
document understanding, omni-modal models, and real-time streaming.

### 9.1 Multimodal Capability Structure

```yaml
multimodal:
  input:
    vision: { supported: true, formats: [jpeg, png], document_understanding: true }
    audio: { supported: true, formats: [mp3, wav], real_time_streaming: false }
    video: { supported: true, formats: [mp4, mov], temporal_reasoning: true }
  output:
    text: true
    audio: { supported: false }   # Qwen2.5-Omni: true
    image: { supported: false }   # Gemini Nano Banana / DALL-E: true
  omni_mode:
    supported: false              # True for Qwen2.5-Omni
    real_time_voice_chat: false
    streaming_multimodal: false
```

### 9.2 Multimodal Schema

See `schemas/v2/multimodal.json` for the full JSON Schema definition.

---

## 10. ProviderContract Specification (V2 Addition)

The ProviderContract defines the **runtime behavioral contract** between AI-Protocol and
provider implementations. It bridges the declarative manifest with the imperative ProviderDriver.

### 10.1 Contract Scope

| Aspect | Description | Schema |
|--------|-------------|--------|
| **API Style** | How to construct requests (OpenAI-compatible, Anthropic Messages, Gemini) | `api_style` |
| **Request Mapping** | Transform UnifiedRequest → provider format | `request_mapping` |
| **Response Mapping** | Extract unified response from provider format | `response_mapping` |
| **Capability Contracts** | Per-capability behavioral guarantees | `capability_contracts` |
| **Degradation Strategy** | What to do when capability is unavailable | `degradation` |

### 10.2 API Style Classification

Most providers fall into one of these API styles:

```
┌──────────────────┬──────────────────┬──────────────────┐
│ openai_compatible │ anthropic_messages│ gemini_generate  │
├──────────────────┼──────────────────┼──────────────────┤
│ OpenAI           │ Anthropic        │ Google Gemini    │
│ DeepSeek         │                  │                  │
│ Moonshot (Kimi)  │                  │                  │
│ Zhipu (GLM)      │                  │                  │
│ Together AI      │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

### 10.3 Contract Schema

See `schemas/v2/provider-contract.json` for the full JSON Schema definition.

---

## 11. ProviderDriver Architecture (V2 Addition)

The ProviderDriver is the **runtime abstraction** that implements the ProviderContract.
Both Rust and Python runtimes implement this pattern.

### 11.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Application Layer                                        │
│  AiClient.chat(messages, options)                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ ProviderDriver (trait / ABC)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ OpenAI   │ │Anthropic │ │ Gemini   │ │ Custom    │  │
│  │ Driver   │ │ Driver   │ │ Driver   │ │ Driver    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼────┐  │
│  │           Capability Registry                      │  │
│  │  Loads modules based on manifest capabilities      │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Transport Layer                                          │
│  HTTP client → Provider API                              │
└─────────────────────────────────────────────────────────┘
```

### 11.2 ProviderDriver Interface

**Rust:**
```rust
#[async_trait]
pub trait ProviderDriver: Send + Sync {
    fn provider_id(&self) -> &str;
    fn api_style(&self) -> ApiStyle;
    fn build_request(&self, req: &UnifiedRequest) -> Result<HttpRequest>;
    fn parse_response(&self, resp: &HttpResponse) -> Result<ChatResponse>;
    fn build_stream_request(&self, req: &UnifiedRequest) -> Result<HttpRequest>;
    fn parse_stream_event(&self, event: &RawEvent) -> Result<StreamingEvent>;
    fn supported_capabilities(&self) -> &[Capability];
}
```

**Python:**
```python
class ProviderDriver(ABC):
    @abstractmethod
    def provider_id(self) -> str: ...
    @abstractmethod
    def api_style(self) -> ApiStyle: ...
    @abstractmethod
    async def build_request(self, req: UnifiedRequest) -> HttpRequest: ...
    @abstractmethod
    async def parse_response(self, resp: HttpResponse) -> ChatResponse: ...
    @abstractmethod
    async def build_stream_request(self, req: UnifiedRequest) -> HttpRequest: ...
    @abstractmethod
    async def parse_stream_event(self, event: RawEvent) -> StreamingEvent: ...
    @abstractmethod
    def supported_capabilities(self) -> list[Capability]: ...
```

### 11.3 Driver Selection

The runtime selects a driver based on the manifest's `api_style` or `provider_contract`:

1. Load manifest → extract `api_style` (or infer from known provider ID)
2. Look up registered ProviderDriver for that style
3. Validate capability compatibility
4. Return configured driver instance

---

## 12. Context Management Policy (V2 Addition)

V2 introduces a declarative context management policy that runtimes can use to
automatically manage context windows across providers with different limits.

### 12.1 Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `sliding_window` | Drop oldest messages, keep recent | Short conversations |
| `summarize` | Compress old context into summary | Long conversations |
| `truncate_oldest` | Hard cut oldest messages | Simple applications |
| `token_budget` | Allocate tokens per role | Complex multi-tool apps |
| `adaptive` | Auto-select based on context fill ratio | Production systems |

### 12.2 Token Budget Model

```
┌──────────────────────────────────────────┐
│ Provider Context Window (e.g. 128K)       │
├──────────────────────────────────────────┤
│ [System Messages]    ← system_budget      │
│ [Tool Definitions]   ← tool_budget        │
│ [Conversation History]← remaining         │
│ [Reserved for Output] ← reserve_output    │
└──────────────────────────────────────────┘
```

### 12.3 Context Policy Schema

See `schemas/v2/context-policy.json` for the full JSON Schema definition.

---

## 13. Schema File Organization (v1.0)

```
schemas/
├── v1.json                        # V1 provider/model schema (stable)
├── spec.json                      # Spec file schema (stable)
└── v2/                            # V2 schema collection
    ├── provider.json              # V2 provider manifest (Ring 1-3) — root schema
    ├── capabilities.json          # Capability declaration (required/optional + flags)
    ├── errors.json                # 13 standard error codes
    ├── error-codes.yaml           # Error code reference data
    ├── endpoint.json              # Endpoint configuration
    ├── availability.json          # Availability + health check
    ├── regions.json               # Region definitions
    ├── multimodal.json            # Extended multimodal (vision/audio/video/omni)
    ├── computer-use.json          # Computer Use / GUI automation
    ├── mcp.json                   # MCP integration (client/server)
    ├── provider-contract.json     # Runtime provider contract ★ NEW
    └── context-policy.json        # Context management policy ★ NEW
```

---

## 14. Decision Log

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
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/main/schemas/v2/provider.json"

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
