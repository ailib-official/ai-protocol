# Cross-Runtime Behavioral Consistency

> AI-Protocol mandates that runtimes implementing the same protocol version produce
> **identical observable outcomes** for every mandatory behavior, regardless of the
> host language. This document defines what "identical" means, catalogues the
> mandatory and optional behaviors, and explains how the compliance test suite
> enforces the contract.

## Table of Contents

- [1. Design Principles](#1-design-principles)
- [2. Mandatory Behaviors](#2-mandatory-behaviors)
  - [2.1 Error Classification](#21-error-classification)
  - [2.2 Streaming Event Mapping](#22-streaming-event-mapping)
  - [2.3 Tool Call Assembly](#23-tool-call-assembly)
  - [2.4 Parameter Normalization](#24-parameter-normalization)
  - [2.5 Protocol Validation](#25-protocol-validation)
- [3. Allowed Differences](#3-allowed-differences)
- [4. Standard Error Code System](#4-standard-error-code-system)
  - [4.1 Error Code Table](#41-error-code-table)
  - [4.2 Provider Mapping Pipeline](#42-provider-mapping-pipeline)
  - [4.3 Runtime Implementation Matrix](#43-runtime-implementation-matrix)
- [5. Feature Flag Alignment](#5-feature-flag-alignment)
  - [5.1 Protocol-Level Flags](#51-protocol-level-flags)
  - [5.2 Runtime-Level Flags](#52-runtime-level-flags)
- [6. Compliance Test Suite](#6-compliance-test-suite)
  - [6.1 Architecture](#61-architecture)
  - [6.2 Test Categories](#62-test-categories)
  - [6.3 Running the Tests](#63-running-the-tests)
  - [6.4 Adding New Test Cases](#64-adding-new-test-cases)
- [7. Runtime Comparison](#7-runtime-comparison)
- [8. Verification Checklist](#8-verification-checklist)

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Protocol as Source of Truth** | The YAML manifests and JSON Schemas in `ai-protocol` define the contract; runtimes are implementations of that contract. |
| **Observable Equivalence** | Given the same input (HTTP status, response body, manifest, request), every runtime must produce the same classified error code, the same streaming events, and the same compiled request — bit-for-bit where applicable. |
| **Test-Driven Verification** | A shared, declarative YAML test suite in `tests/compliance/` serves as the executable specification. Both runtimes consume the same test cases. |
| **Lean Core, Rich Extensions** | Mandatory behaviors are limited to the protocol core (L1). Capability extensions (L2) follow the same consistency rules when enabled. |

---

## 2. Mandatory Behaviors

These behaviors **must** produce identical results across all conforming runtimes.

### 2.1 Error Classification

Given the same HTTP status code, response body, and provider context, every runtime
must classify the error into the same `StandardErrorCode`, with identical `retryable`
and `fallbackable` flags.

**Classification priority (highest to lowest):**

1. Provider-specific error code in response body (e.g., `invalid_api_key` → E1002)
2. Provider-specific HTTP status override (e.g., Anthropic HTTP 529 → E3002)
3. Standard HTTP status mapping (e.g., HTTP 401 → E1002)
4. Fallback to `E9999` (unknown)

**Example:**

```
Input:  HTTP 429 + body contains "quota" keyword
Rust:   StandardErrorCode::QuotaExhausted (E2002, retryable=false, fallbackable=true)
Python: QUOTA_EXHAUSTED              (E2002, retryable=false, fallbackable=true)
```

### 2.2 Streaming Event Mapping

Given the same raw SSE (Server-Sent Events) byte stream from a provider, every
runtime must emit the same sequence of normalized `StreamingEvent` values:

| Provider Frame | Normalized Event |
|----------------|-----------------|
| `data: {"choices":[{"delta":{"content":"Hi"}}]}` | `ContentDelta("Hi")` |
| `data: {"choices":[{"delta":{"tool_calls":[...]}}]}` | `ToolCallDelta(...)` |
| `data: [DONE]` | `Done` |

Frame decoding, event classification, and content extraction must be byte-equivalent.

### 2.3 Tool Call Assembly

Given the same sequence of partial tool call chunks from a streaming response,
every runtime must assemble them into the same final `ToolCall` structure:

- Same function name
- Same argument string (JSON)
- Same call ID
- Same ordering

### 2.4 Parameter Normalization

Given a `UnifiedRequest` and a provider manifest, every runtime must compile the
same provider-specific HTTP request body:

- Same JSON keys (after `parameter_mappings` application)
- Same value transformations
- Same omission of unsupported parameters

### 2.5 Protocol Validation

Given the same manifest YAML and JSON Schema:

- Valid manifests must pass in all runtimes
- Invalid manifests must fail with the same category of validation error
- Required fields, type constraints, and enum values must be enforced identically

---

## 3. Allowed Differences

These aspects may differ between runtimes without violating the protocol contract.

| Aspect | Rust (ai-lib-rust) | Python (ai-lib-python) | Reason |
|--------|-------------------|----------------------|--------|
| **Async model** | `tokio` runtime, `async/await` with `Future` | `asyncio` event loop, `async/await` with coroutines | Language-native async |
| **Error type hierarchy** | `enum Error` with `thiserror` | Class hierarchy with `AiLibError` base | Language-idiomatic error handling |
| **Configuration API** | Builder pattern (`AiClientBuilder`) | Builder pattern + Pydantic models | Type system differences |
| **Performance** | Zero-cost abstractions, no GC | GC-managed, interpreter overhead | Expected |
| **Memory management** | Ownership + borrowing | Reference counting + GC | Language-fundamental |
| **Serialization internals** | `serde` derive macros | `pydantic` / manual dict construction | Implementation detail |
| **Logging framework** | `tracing` crate | `logging` stdlib + OpenTelemetry | Ecosystem convention |
| **HTTP client** | `reqwest` | `httpx` | Ecosystem convention |

---

## 4. Standard Error Code System

### 4.1 Error Code Table

All runtimes must implement the complete error code table as defined in
`schemas/v2/error-codes.yaml`:

| Code | Name | Category | HTTP Status | Retryable | Fallbackable |
|------|------|----------|-------------|-----------|--------------|
| E1001 | `invalid_request` | client | 400 | No | No |
| E1002 | `authentication` | client | 401 | No | Yes |
| E1003 | `permission_denied` | client | 403 | No | No |
| E1004 | `not_found` | client | 404 | No | No |
| E1005 | `request_too_large` | client | 413 | No | No |

**Capability guard (adv-001..004, gen-007):** When a runtime rejects a call because the manifest does not declare an advanced capability (MCP, computer_use, reasoning, video, etc.), compliance cases expect **`E1005`** — a deliberate reuse of the client-error bucket (not a separate `E1006`). Runtimes MUST NOT send HTTP requests for blocked capability calls; the code signals a client-side precondition failure aligned with `schemas/v2/error-codes.yaml` `compliance_aliases`.

| E2001 | `rate_limited` | rate | 429 | Yes | Yes |
| E2002 | `quota_exhausted` | rate | 429 | No | Yes |
| E3001 | `server_error` | server | 500 | Yes | Yes |
| E3002 | `overloaded` | server | 503 | Yes | Yes |
| E3003 | `timeout` | server | 504 | Yes | Yes |
| E4001 | `conflict` | operational | 409 | Yes | No |
| E4002 | `cancelled` | operational | — | No | No |
| E9999 | `unknown` | unknown | varies | No | No |

### 4.2 Provider Mapping Pipeline

```
┌─────────────────┐
│ HTTP Response    │
│ (status + body)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Step 1: Extract provider error code from    │
│         response body (e.g. "invalid_api_key")│
│         → If matched, use provider mapping   │
└────────┬────────────────────────────────────┘
         │ (no match?)
         ▼
┌─────────────────────────────────────────────┐
│ Step 2: Check provider-specific HTTP status │
│         overrides (e.g. Anthropic 529)      │
│         → If matched, use override mapping  │
└────────┬────────────────────────────────────┘
         │ (no match?)
         ▼
┌─────────────────────────────────────────────┐
│ Step 3: Standard HTTP status → error code   │
│         (e.g. 401 → E1002)                  │
└────────┬────────────────────────────────────┘
         │ (no match?)
         ▼
┌─────────────────┐
│ E9999 (unknown) │
└─────────────────┘
```

### 4.3 Runtime Implementation Matrix

| Feature | Rust (`ai-lib-rust`) | Python (`ai-lib-python`) |
|---------|---------------------|-------------------------|
| Error code type | `enum StandardErrorCode` | `@dataclass(frozen=True) StandardErrorCode` |
| Module location | `src/error_code.rs` | `errors/standard_codes.py` |
| From HTTP status | `StandardErrorCode::from_http_status(u16)` | `from_http_status(status: int)` |
| From provider code | `StandardErrorCode::from_provider_code(&str)` | via `classify_http_error()` |
| From error class | `StandardErrorCode::from_error_class(&str)` | `from_error_class(name: str)` |
| Response classification | `classify_error_from_response(status, body)` | `classify_http_error(status, body, headers)` |
| Retryable query | `.retryable() -> bool` | `.retryable: bool` |
| Fallbackable query | `.fallbackable() -> bool` | `.fallbackable: bool` |
| HTTP 529 support | Yes (Anthropic overloaded) | Yes (Anthropic overloaded) |
| Compliance tests | `tests/compliance.rs` | `tests/compliance/test_compliance.py` |

---

## 5. Feature Flag Alignment

### 5.1 Protocol-Level Flags

Protocol manifests declare capabilities in the `capabilities` section.
These are provider characteristics, not runtime toggles:

```yaml
capabilities:
  required:
    - text
    - streaming
  optional:
    - vision
    - tool_call
    - structured_output
```

### 5.2 Runtime-Level Flags

Runtime feature flags control **which modules are compiled/loaded**. The mapping
between Rust Cargo features and Python pip extras is:

| Capability | Rust Feature | Python Extra | Purpose |
|------------|-------------|-------------|---------|
| Embeddings | `embeddings` | `embeddings` | Embedding generation |
| Batch processing | `batch` | `batch` | Batch API support |
| Guardrails | `guardrails` | — | Input/output validation |
| Token counting | `tokens` | `tokenizer` | Token estimation |
| Telemetry | `telemetry` | `telemetry` | Observability & feedback |
| Vision | — | `vision` | Image processing (PIL) |
| Audio | — | `audio` | Audio processing |
| Structured output | `structured` (always-on) | `structured` | JSON schema validation |
| Agentic | — | `agentic` | Agent workflow support |
| Routing | `routing_mvp` | — | Multi-provider routing |
| Interceptors | `interceptors` | — | Request/response hooks |
| All-in-one | `full` | `full` | Enable everything |

**Default build**: Both runtimes ship with a lean core by default. Optional
capabilities must be explicitly opted into:

```bash
# Rust: enable specific features
cargo add ai-lib-rust --features "embeddings,telemetry"

# Python: install with extras
pip install ai-lib-python[embeddings,telemetry]
```

---

## 6. Compliance Test Suite

### 6.1 Architecture

```
ai-protocol/tests/compliance/
├── cases/
│   ├── 01-protocol-loading/     # Manifest load & validation
│   ├── 02-error-classification/ # HTTP status & provider code mapping
│   ├── 03-message-building/     # Standard message construction
│   ├── 04-streaming/            # SSE decode, event mapping, tool accumulation
│   ├── 05-request-building/     # Parameter normalization
│   └── 06-resilience/           # Retry policy behavior
├── fixtures/
│   ├── providers/               # Mock manifests (openai, anthropic)
│   └── responses/               # Recorded HTTP error responses
├── schema.json                  # JSON Schema for test case format
└── README.md                    # Test suite documentation
```

### 6.2 Test Categories

| Category | Cases | Mandatory | Status |
|----------|-------|-----------|--------|
| 01-protocol-loading | Load valid/invalid manifests | Yes | Implemented |
| 02-error-classification | HTTP status, provider codes, retry/fallback | Yes | Implemented (20/20 both runtimes) |
| 03-message-building | Standard message construction | Yes | Defined |
| 04-streaming | SSE decode, event mapping, tool accumulation | Yes | Defined |
| 05-request-building | Parameter normalization | Yes | Defined |
| 06-resilience | Retry policy | Yes | Defined |

### 6.3 Running the Tests

**Rust:**

```bash
cd ai-lib-rust
cargo test --test compliance
# Or with explicit compliance directory:
COMPLIANCE_DIR=../ai-protocol/tests/compliance cargo test --test compliance
```

**Python:**

```bash
cd ai-lib-python
pytest tests/compliance/ -v
# Or with explicit compliance directory:
COMPLIANCE_DIR=../ai-protocol/tests/compliance pytest tests/compliance/ -v
```

Both runners:
1. Discover YAML test case files in the compliance directory
2. Parse multi-document YAML (each document = one test case)
3. Execute the test operation (e.g., `error_classification`)
4. Assert against expected outputs

### 6.4 Adding New Test Cases

1. Create a YAML file in the appropriate `cases/` subdirectory
2. Follow the test case schema defined in `schema.json`
3. Each document must include:

```yaml
name: "descriptive test name"
operation: "error_classification"  # or other operation type
input:
  http_status: 401
  response_body:
    error:
      type: "invalid_api_key"
expected:
  error_code: "E1002"
  error_name: "authentication"
  retryable: false
  fallbackable: true
```

4. Run both Rust and Python compliance tests to verify cross-runtime consistency

---

## 7. Runtime Comparison

| Dimension | ai-lib-rust v0.6.6 | ai-lib-python v0.5.0 |
|-----------|--------------------|-----------------------|
| Language | Rust 1.75+ | Python 3.10+ |
| HTTP client | reqwest | httpx |
| Async runtime | tokio | asyncio |
| Serialization | serde | pydantic + json |
| Schema validation | jsonschema + schemars | fastjsonschema |
| Error codes | 13 StandardErrorCode variants | 13 StandardErrorCode instances |
| Feature flags | 7 Cargo features + `full` | 8 pip extras + `full` |
| Core modules | 11 always-compiled | 15+ always-importable |
| Gated modules | 7 feature-gated | 6 runtime-detected |
| Compliance tests | `tests/compliance.rs` | `tests/compliance/test_compliance.py` |
| Unit tests | 7 root + 6 integration | 22 unit + 5 integration |

---

## 8. Verification Checklist

Use this checklist when making changes to either runtime to ensure cross-runtime
consistency is maintained:

- [ ] **Error classification**: Same HTTP status + body → same `StandardErrorCode`
  - Run: `cargo test --test compliance` and `pytest tests/compliance/`
- [ ] **New error code**: Added to both `error_code.rs` and `standard_codes.py`
  - Matches `schemas/v2/error-codes.yaml` definition
- [ ] **Provider mapping**: New provider code mapped in both runtimes
  - Test case added to `02-error-classification/provider-error-codes.yaml`
- [ ] **Streaming events**: Same SSE frame → same normalized event
  - Test case added to `04-streaming/`
- [ ] **Feature flag**: New capability gated in both runtimes
  - Rust: `Cargo.toml` feature + `#[cfg(feature = "...")]`
  - Python: `pyproject.toml` extra + `_features.py` detection
- [ ] **Parameter mapping**: Same `UnifiedRequest` → same provider request
  - Test case added to `05-request-building/`
- [ ] **README update**: Both English and Chinese versions updated in all three repos

---

*This document is maintained as part of the AI-Protocol V2 specification. For
architectural context, see [V2_ARCHITECTURE.md](V2_ARCHITECTURE.md). For the
compliance test suite details, see [tests/compliance/README.md](../tests/compliance/README.md).*
