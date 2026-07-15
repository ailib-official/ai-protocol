# AI-Protocol Runtime Integration Guide

**Version**: v0.5.0 | **Last Updated**: 2026-07-15 (PT-ARCH-006 hygiene)

> **Start here for authority:** [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md)
> (`production_default` / LTS wire = **v1**; `latest` = evolution tip **v2**).
> Manifest layers: [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md).
> Provider identity: [`PROVIDER_IDENTITY.md`](./PROVIDER_IDENTITY.md).
> This guide remains a **how-to** for runtime authors; it does not override those
> Normative docs when wording conflicts.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Implementation Steps](#implementation-steps)
5. [Protocol Loading](#protocol-loading)
6. [Request Processing](#request-processing)
7. [Stream Processing Pipeline](#stream-processing-pipeline)
8. [Error Handling](#error-handling)
9. [Validation](#validation)
10. [Testing Strategy](#testing-strategy)
11. [Migration Guide](#migration-guide)
12. [Reference Implementations](#reference-implementations)

---

## Overview

This guide explains how to integrate AI-Protocol into a new runtime. By following this guide, you can create a runtime that automatically supports all providers configured in AI-Protocol without writing provider-specific code.

### What You'll Build

A runtime with:
- **Protocol-driven architecture** - All behavior from provider manifests
- **Hot-reload support** - Update providers without restart
- **Streaming pipeline** - Normalized streaming events
- **Error normalization** - Standard error types
- **Resilience patterns** - Retry, rate limiting, circuit breaker

### Target Audience

- Runtime implementers (AI SDK developers)
- Framework integrators (e.g., LangChain, LlamaIndex)
- Engine builders (in-house AI platforms)

---

## Architecture

### Layered Design

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Application                           │
│                  (Your SDK/Framework)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Runtime Implementation                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  User Interface Layer (API)                                  │  │
│  │  - Unified client, builders, types                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Protocol Layer                                             │  │
│  │  - Loader (local/remote/GitHub)                             │  │
│  │  - Validator (JSON Schema)                                  │  │
│  │  - Manifest (Typed representation)                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Pipeline Layer                                             │  │
│  │  - Decoder (SSE/NDJSON)                                     │  │
│  │  - Selector (JSONPath)                                      │  │
│  │  - Accumulator (Tool call state)                           │  │
│  │  - FanOut (Multi-candidate)                                 │  │
│  │  - Event Mapper (Normalization)                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Transport Layer                                            │  │
│  │  - HTTP client                                              │  │
│  │  - Auth resolution                                          │  │
│  │  - Proxy/timeout configuration                               │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    AI-Protocol Specification                      │
│  - schemas/v1.json (Schema validation)                          │
│  - v1/providers/*.yaml (30+ provider manifests)                  │
│  - v1/models/*.yaml (Model registry)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request (model="anthropic/claude-3-5-sonnet")
         │
         ▼
   ProtocolLoader.load_model("anthropic/claude-3-5-sonnet")
         │
         ├─→ Cache hit? ──Yes──→ Return cached manifest
         │       │
         │       No
         │       │
         ▼    Load provider manifest ("anthropic.yaml")
   ───────►
         │
         ▼
   ProtocolValidator.validate(manifest)
         │
         ▼
   Build UnifiedRequest (from manifest mappings)
         │
         ▼
   TransportLayer.send(request)
         │
         ▼
   └──────► HTTP Request to Provider API
              │
              ▼
         HTTP Response
              │
              ▼
         Streaming? ──No──→ Parse JSON response
              │                 │
              Yes               ▼
              │           Return ChatResponse
              ▼
   Pipeline Operators (Decoder → Selector → EventMapper)
              │
              ▼
   Emit Unified StreamingEvent (PartialContentDelta, ToolCallDelta, etc.)
```

---

## Core Components

### 1. Protocol Loader

**Purpose**: Load provider/model manifests from various sources

**Responsibilities**:
- Search multiple directories for manifests
- Support file system and remote (GitHub) loading
- Cache manifests for performance
- Hot-reload (listen to file changes)

**Interface (pseudo-code)**:
```typescript
interface ProtocolLoader {
  // Load a provider by ID
  loadProvider(providerId: string): Promise<ProtocolManifest>

  // Load a model (provider/model format)
  loadModel(model: string): Promise<ProtocolManifest>

  // Set custom base path
  withBasePath(path: string): this

  // Enable hot reload
  withHotReload(enabled: boolean): this
}
```

### 2. Protocol Validator

**Purpose**: Validate manifests against JSON Schema

**Responsibilities**:
- Load JSON Schema (`schemas/v1.json`)
- Validate provider manifests
- Validate model registries
- Report validation errors

**Interface**:
```typescript
interface ProtocolValidator {
  validateManifest(manifest: unknown): ValidationResult
  validateModelRegistry(registry: unknown): ValidationResult
}

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
```

### 3. Protocol Manifest

**Purpose**: Typed representation of provider configuration

**Key Fields**:
```typescript
interface ProtocolManifest {
  id: string
  protocolVersion: string
  endpoint: {
    baseUrl: string
    protocol: 'https' | 'http'
  }
  auth: AuthConfig
  streaming?: StreamingConfig
  parameterMappings: Record<string, string>
  errorClassification: ErrorClassification
  retryPolicy: RetryPolicy
  capabilities: Capabilities
}
```

### 4. Transport Layer

**Purpose**: HTTP communication with providers

**Responsibilities**:
- Make HTTP requests
- Handle authentication
- Set custom headers
- Proxy and timeout configuration
- API key resolution (env, keyring)

**Interface**:
```typescript
interface TransportLayer {
  send(request: UnifiedRequest): Promise<HttpResponse>
  sendStreaming(request: UnifiedRequest): AsyncIterator<HttpFrame>
}

interface UnifiedRequest {
  endpoint: string
  method: 'GET' | 'POST'
  headers: Record<string, string>
  body: unknown
  stream?: boolean
}
```

### 5. Pipeline Operators

**Purpose**: Process raw provider responses into unified events

**Operators**:

#### Decoder
- Parse raw byte stream into JSON objects
- Handle SSE (Server-Sent Events), NDJSON formats

#### Selector  
- Use JSONPath to filter relevant frames
- Example: `$.type in ['delta', 'done']`

#### Accumulator
- Maintain state across streaming frames
- Accumulate partial objects (e.g., tool call arguments)

#### FanOut
- Handle multi-candidate responses
- Replicate events for parallel processing

#### Event Mapper
- Transform provider-specific events to unified `StreamingEvent` types
- Map field names using JSONPath expressions

---

## Implementation Steps

### Step 1: Project Setup

```bash
# Create runtime project
mkdir my-ai-runtime
cd my-ai-runtime

# Initialize based on language
# Rust:
cargo init
cargo add reqwest serde jsonpath-lib tokio

# Python:
python -m venv venv
source venv/bin/activate
pip install pydantic httpx jsonpath-ng
```

### Step 2: Define Core Types

Define types matching AI-Protocol standard schema:

**Rust**:
```rust
// types/manifest.rs
#[derive(Debug, Deserialize)]
pub struct ProtocolManifest {
    pub id: String,
    pub protocol_version: String,
    pub endpoint: EndpointConfig,
    pub auth: AuthConfig,
    pub streaming: Option<StreamingConfig>,
    pub parameter_mappings: HashMap<String, String>,
    pub error_classification: ErrorClassification,
    pub retry_policy: RetryPolicy,
    pub capabilities: Capabilities,
}

// types/events.rs
#[derive(Debug, Clone)]
pub enum StreamingEvent {
    PartialContentDelta { content: String },
    ToolCallStarted { tool_call_id: String, tool_name: String },
    ToolCallDelta { arguments: serde_json::Value },
    StreamEnd { finish_reason: String },
    StreamError { error_message: String },
}
```

**Python**:
```python
# types/manifest.py
from pydantic import BaseModel
from typing import Dict, Optional

class ProtocolManifest(BaseModel):
    id: str
    protocol_version: str
    endpoint: EndpointConfig
    auth: AuthConfig
    streaming: Optional[StreamingConfig] = None
    parameter_mappings: Dict[str, str]
    error_classification: ErrorClassification
    retry_policy: RetryPolicy
    capabilities: Capabilities

# types/events.py
from enum import Enum

class StreamingEvent(BaseModel):
    type: str
    content: Optional[str] = None
    ...
```

### Step 3: Implement Protocol Loader

**Rust Example**:
```rust
use std::path::{PathBuf};
use serde_yaml;
use lru::LruCache;

pub struct ProtocolLoader {
    base_path: Option<PathBuf>,
    hot_reload: bool,
    cache: LruCache<String, ProtocolManifest>,
}

impl ProtocolLoader {
    pub async fn load_provider(&self, id: &str) -> Result<ProtocolManifest> {
        // Check cache
        // Load from file system
        // Parse YAML
        // Cache result
    }
}
```

**Python Example**:
```python
import yaml
from pathlib import Path

class ProtocolLoader:
    def __init__(self, base_path: Optional[Path] = None, hot_reload: bool = False):
        self.base_path = base_path
        self.hot_reload = hot_reload
        self.cache = {}

    async def load_provider(self, id: str) -> ProtocolManifest:
        # Check cache
        # Load from file
        # Parse YAML
        # Return manifest
```

### Step 4: Implement Transport Layer

**Rust**:
```rust
pub struct HttpTransport {
    client: reqwest::Client,
    proxy: Option<String>,
    timeout: Duration,
}

impl HttpTransport {
    pub async fn send_request(&self, request: UnifiedRequest) -> Result<HttpResponse> {
        // Build reqwest request
        // Add headers
        // Set timeout
        // Send request
        // Handle response
    }
}
```

**Python**:
```python
import httpx

class HttpTransport:
    def __init__(self, proxy: Optional[str] = None, timeout: int = 60):
        self.client = httpx.AsyncClient(proxies=proxy, timeout=timeout)

    async def send_request(self, request: UnifiedRequest) -> HttpResponse:
        response = await self.client.request(
            method=request.method,
            url=request.endpoint,
            headers=request.headers,
            json=request.body
        )
        return HttpResponse.from_httpx(response)
```

### Step 5: Implement Streaming Pipeline

**Key Steps**:

1. **Decode** - Parse SSE/NDJSON frames
2. **Select** - Filter with JSONPath
3. **Accumulate** - Maintain state (tool calls)
4. **Map** - Transform to unified events
5. **Emit** - Yield to caller

**Pseudocode**:
```typescript
async function* processStream(
  response: HttpStream,
  manifest: ProtocolManifest
): AsyncIterator<StreamingEvent> {

  // Decode: Parse raw frames
  for (const raw_frame of decodeStream(response, manifest.streaming.decoder)) {
    // Select: Filter relevant frames
    if (!matchesJsonPath(raw_frame, manifest.streaming.frame_selector)) {
      continue;
    }

    // Accumulate: Stateful processing
    const accumulated_state = accumulate(raw_frame, manifest.streaming.accumulator);

    // Map: Transform to unified event
    for (const event of mapToJsonPath(accumulated_state, manifest.streaming.event_map)) {
      yield event;
    }
  }
}
```

### Step 6: Implement Error Classification

Map provider errors to standard types:

```typescript
function classifyError(
  manifest: ProtocolManifest,
  httpStatus: number,
  errorCode: string | null,
  errorMessage: string
): string {
  const classification = manifest.error_classification;

  // 1. Check error code (highest priority)
  if (errorCode && classification.by_error_code?.[errorCode]) {
    return classification.by_error_code[errorCode];
  }

  // 2. Check message contains
  for (const [keyword, errorType] of Object.entries(classification.by_message_contains || {})) {
    if (errorMessage.toLowerCase().includes(keyword.toLowerCase())) {
      return errorType;
    }
  }

  // 3. Check HTTP status (fallback)
  return classification.by_http_status?.[httpStatus] || 'other';
}
```

---

## Protocol Loading

### Search Order

Runtime should search in this order:

1. **Custom path** (if set)
2. **Environment variable** (`AI_PROTOCOL_DIR`, `AI_PROTOCOL_PATH`)
3. **Relative paths** (`ai-protocol/`, `../ai-protocol/`, `../../ai-protocol/`)
4. **Fallback to GitHub** (`https://raw.githubusercontent.com/ailib-official/ai-protocol/main`)

### Path Resolution Algorithm

```typescript
function resolveManifestPath(providerId: string): string | null {
  // 1. Custom path
  if (customPath) {
    const path = join(customPath, 'v1/providers', `${providerId}.yaml`);
    if (exists(path)) return path;
  }

  // 2. Environment variable
  const envPath = process.env.AI_PROTOCOL_DIR || process.env.AI_PROTOCOL_PATH;
  if (envPath) {
    const path = join(envPath, 'v1/providers', `${providerId}.yaml`);
    if (exists(path)) return path;
  }

  // 3. Relative paths
  for (const rel of ['ai-protocol', '../ai-protocol', '../../ai-protocol']) {
    const path = join(rel, 'v1/providers', `${providerId}.yaml`);
    if (exists(path)) return path;
  }

  // 4. GitHub fallback
  return `https://raw.githubusercontent.com/ailib-official/ai-protocol/main/v1/providers/${providerId}.yaml`;
}
```

### Model Resolution

```typescript
async function loadModel(modelString: string): Promise<ProtocolManifest> {
  // Parse "provider/model" format
  const [provider, ...modelParts] = modelString.split('/');
  const modelName = modelParts.join('/');

  // Try model registry first
  const modelConfig = loadModelRegistry(modelName);
  if (modelConfig) {
    return loadProvider(modelConfig.provider);
  }

  // Fallback: load provider directly
  return loadProvider(provider);
}
```

---

## Request Processing

### 1. Build Unified Request

Transform user request into provider-specific format:

```typescript
function buildUnifiedRequest(
  manifest: ProtocolManifest,
  userRequest: UserRequest
): UnifiedRequest {
  const providerRequest = {};

  // Map parameters using manifest mappings
  for (const [standard, provider] of Object.entries(manifest.parameter_mappings)) {
    if (userRequest[standard] !== undefined) {
      providerRequest[provider] = userRequest[standard];
    }
  }

  // Add required fields
  providerRequest.model = userRequest.model;

  return {
    endpoint: `${manifest.endpoint.base_url}/chat/completions`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey(manifest.auth.token_env)}`,
    },
    body: providerRequest,
    stream: userRequest.stream,
  };
}
```

### 2. Send Request

```typescript
async function executeRequest(
  request: UnifiedRequest,
  manifest: ProtocolManifest
): Promise<ChatResponse> {
  // Apply retry policy
  const response = await withRetry(manifest.retry_policy, async () => {
    return await transport.send(request);
  });

  // Classify errors
  if (!response.ok) {
    const errorType = classifyError(
      manifest,
      response.status,
      response.body?.code,
      response.body?.message
    );
    throw RuntimeError(errorType, response.body?.message);
  }

  return adaptResponse(response.body);
}
```

---

## Stream Processing Pipeline

### Operator Flow

```
Raw Bytes
    │
    ▼
┌─────────┐     JSON Objects
│ Decoder ──►──────────────►│
└─────────┘                    │
                 │
                 ▼
         ┌──────────────┐     Filtered
         │  Selector    ──►────────────────────►
         └──────────────┘                   │
                                       │
                 │               ┌──────────────┐
                 │               │ Accumulator │
                 └───────────────►│   (state)    │
                                 └──────────────┘
                                       │
                                 ┌──────────────┐
                                 │   FanOut     │
                                 └──────────────┘
                                       │
                                 ┌──────────────┐       Unified
                                 │ EventMapper  ──►──────────────►│
                                 └──────────────┘    Events
```

### Implementation Pattern

```typescript
async function* streamPipeline(
  rawStream: AsyncIterable<Buffer>,
  manifest: ProtocolManifest
): AsyncIterator<StreamingEvent> {

  const state = new Map<string, any>();

  for (const buffer of rawStream) {
    // Step 1: Decode
    const frames = decodeStream(buffer, manifest.streaming.decoder);

    for (const frame of frames) {
      // Step 2: Select
      if (!jsonPathMatches(frame, manifest.streaming.frame_selector)) {
        continue;
      }

      // Step 3: Accumulate
      const result = accumulate(frame, state, manifest.streaming.accumulator);

      // Step 4: FanOut (if multi-candidate)
      const candidates = handleFanOut(result, manifest.streaming);

      // Step 5: Map to unified events
      for (const candidate of candidates) {
        const events = mapEvents(candidate, manifest.streaming.event_map);
        for (const event of events) {
          yield event;
        }
      }
    }
  }
}
```

---

## Error Handling

### Standard Error Types

```typescript
enum StandardError {
  AUTHENTICATION = 'authentication',
  RATE_LIMITED = 'rate_limited',
  QUOTA_EXCEEDED = 'quota_exceeded',
  INVALID_REQUEST = 'invalid_request',
  CONTEXT_LENGTH_EXCEEDED = 'context_length_exceeded',
  SERVER_ERROR = 'server_error',
  STREAM_INTERRUPTED = 'stream_interrupted',
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  INVALID_TOOL = 'invalid_tool',
  CONTENT_FILTER = 'content_filter',
  OTHER = 'other',
}
```

### Error Wrapping

```typescript
class RuntimeError extends Error {
  constructor(
    public errorType: StandardError,
    public provider: string,
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(`${StandardError[errorType]}: ${message}`);
  }
}
```

---

## Validation

### Inline Validation

Validate manifests on load:

```typescript
export class ProtocolLoader {
  private validator: ProtocolValidator;

  async loadProvider(id: string): Promise<ProtocolManifest> {
    const raw = await this.readFile(id);
    const parsed = yaml.parse(raw);

    // Validate before caching
    const result = this.validator.validateManifest(parsed);
    if (!result.valid) {
      throw new ValidationError(result.errors);
    }

    return parsed as ProtocolManifest;
  }
}
```

### Offline Support

Embed JSON Schema for offline validation:

```typescript
// schemas/embedded.ts
export const V1_SCHEMA = {
  // Embedded JSON Schema content
};

export class ProtocolValidator {
  validateManifest(manifest: unknown): ValidationResult {
    return validateWithSchema(manifest, V1_SCHEMA);
  }
}
```

---

## Testing Strategy

### Unit Tests

1. **Protocol Loading** - Test manifest parsing
2. **Error Classification** - Test error mapping
3. **Parameter Mapping** - Test request transformation
4. **Event Mapping** - Test event transformation

### Integration Tests

1. **End-to-End** - Test actual API calls
2. **Streaming** - Test streaming responses
3. **Error Cases** - Test error handling
4. **Multi-provider** - Test across different providers

### Test Provider List

Pick 3-5 representative providers:
- OpenAI (SSE, tools)
- Anthropic (SSE, tools, complex streaming)
- Gemini (NDJSON, vision)
- DeepSeek (minimal provider)

### Example Test

```typescript
describe('Protocol Loader', () => {
  it('should load valid provider manifest', async () => {
    const loader = new ProtocolLoader();
    const manifest = await loader.loadProvider('openai');
    expect(manifest.id).toBe('openai');
    expect(manifest.capabilities.chat).toBe(true);
  });

  it('should apply parameter mappings', () => {
    const manifest = { parameter_mappings: { max_tokens: 'max_completion_tokens' } };
    const request = buildRequest(manifest, { max_tokens: 100 });
    expect(request.body.max_completion_tokens).toBe(100);
  });
});
```

---

## Migration Guide

### From Provider-Specific SDK

**Before** (using OpenAI SDK directly):
```python
import openai
client = openai.Client(api_key="sk-...")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)
```

**After** (using AI-Protocol):
```python
from ai_lib_python import AiClient

client = await AiClient.create("openai/gpt-4o")
response = await client.chat().user("Hello").execute()
```

### Benefits

- **Unified API** - Same code works for all providers
- **Hot-reload** - Update providers without code changes
- **Zero provider code** - Switch providers by changing one string
- **Consistent errors** - Standardized error handling
- **Built-in resilience** - Retry, fallback, circuit breaker

---

## Reference Implementations

### ai-lib-rust

**Architecture**:
- `src/protocol/` - Loading and validation
- `src/pipeline/` - Streaming operators
- `src/transport/` - HTTP layer
- `src/client/` - User API

**Key Files**:
- `protocol/loader.rs` - ProtocolLoader implementation
- `pipeline/event_map.rs` - Event mapping
- `transport/http.rs` - HTTP client

### ai-lib-python

**Architecture**:
- `src/ai_lib_python/protocol/` - Loading and validation
- `src/ai_lib_python/pipeline/` - Streaming operators
- `src/ai_lib_python/transport/` - HTTP layer
- `src/ai_lib_python/client/` - User API

**Key Files**:
- `protocol/loader.py` - ProtocolLoader implementation
- `pipeline/event_map.py` - Event mapping
- `transport/http.py` - HTTP client

### Study These Files

When implementing your runtime:

1. **Protocol Loading**
   - Rust: `src/protocol/loader.rs:49` - `load_model()`
   - Python: `protocol/loader.py:48` - `load_provider()`

2. **Streaming Pipeline**
   - Rust: `src/pipeline/event_map.rs:1` - Event mapping logic
   - Python: `pipeline/event_map.py:45` - Event mapper

3. **Error Classification**
   - Rust: `src/error.rs` - Error types
   - Python: `errors/classification.py` - Error classifier

---

## Appendix

### JSONPath Expressions

Common patterns:

| Expression | Description |
|------------|-------------|
| `$.field` | Field access |
| `$.array[*]` | All array elements |
| `has("field")` | Check field existence |
| `"value" in $.flags` | Value in array |
| `$.type == 'delta'` | Equality check |
| `has("$.text") && $.done == true` | Logical AND |

### Protocol Version Compatibility

| Provider Version | Minimum Runtime Support |
|------------------|------------------------|
| 1.0 | AI-Protocol v0.1.0 |
| 1.1 | AI-Protocol v0.2.0 |
| 1.5 | AI-Protocol v0.3.0 |

### Quick Reference Table

| Component | Required | Complexity | Testing Priority |
|-----------|----------|------------|------------------|
| Protocol Loader | ✅ | Medium | High |
| Protocol Validator | ✅ | Low | High |
| Transport Layer | ✅ | Medium | High |
| Streaming Pipeline | ✅ | High | High |
| Error Classification | ✅ | Low | Medium |
| Event Mapping | ✅ | Medium | High |

---

**Last Updated**: 2026-07-15 | **Version**: v0.5.0

Need help? Check [GETTING_STARTED.md](GETTING_STARTED.md) or [CONTRIBUTING_PROVIDER.md](CONTRIBUTING_PROVIDER.md).
