# AI-Protocol Compliance Test Suite

> **Status**: Phase 2 deliverable  
> **Task ID**: T2.1  
> **Date**: 2026-02-14

## Overview

The compliance test suite ensures **cross-runtime behavioral consistency** between
`ai-lib-rust` and `ai-lib-python`. Test cases are defined as declarative YAML files
in a provider-agnostic format, and each runtime implements a test runner that
executes the same cases.

## Design Principles

1. **Declarative**: Test cases are YAML data, not code.
2. **Runtime-agnostic**: The same test file is consumed by Rust and Python runners.
3. **Deterministic**: Tests use mock/recorded responses to avoid network dependency.
4. **Categorical**: Tests are grouped by protocol feature (error handling, streaming, etc.).
5. **Extensible**: New categories and assertions can be added without framework changes.

## E/P boundary (Wave-5, PT-067)

Execution-layer-only (core) compliance runs exclude policy-heavy cases. See:

- `ep-boundary/E_ONLY_CASES.md` — which case directories apply to core-only runners.
- `ep-boundary/module-matrix.yaml` — E vs P module classification per runtime.
- `ep-boundary/check_ep_boundary.py` — static check that selected Rust E roots do not reference P `crate::` modules.

## Directory Structure

```
tests/compliance/
├── README.md                    # This file
├── schema.json                  # JSON Schema for test case format
├── runner/                      # Runner specifications
│   ├── rust-runner.md           # How to run in ai-lib-rust
│   └── python-runner.md         # How to run in ai-lib-python
├── cases/                       # Test case YAML files
│   ├── 01-protocol-loading/     # Protocol loading and validation
│   │   ├── load-valid-provider.yaml
│   │   ├── load-invalid-provider.yaml
│   │   └── load-model-reference.yaml
│   ├── 02-error-classification/ # Error code mapping
│   │   ├── http-status-mapping.yaml
│   │   ├── provider-error-codes.yaml
│   │   └── retryable-classification.yaml
│   ├── 03-message-building/     # Message construction
│   │   ├── basic-messages.yaml
│   │   ├── multimodal-messages.yaml
│   │   └── tool-messages.yaml
│   ├── 04-streaming/            # Streaming pipeline
│   │   ├── sse-decode.yaml
│   │   ├── event-mapping.yaml
│   │   ├── tool-accumulation.yaml
│   │   └── multi-candidate.yaml
│   ├── 05-request-building/     # Request normalization
│   │   ├── parameter-mapping.yaml
│   │   └── auth-header.yaml
│   └── 06-resilience/           # Retry and fallback
│       ├── retry-policy.yaml
│       └── error-retryable.yaml
│   └── 07-advanced-capabilities/ # Advanced capability guard + endpoint mapping
│       └── capability-and-endpoint.yaml
└── fixtures/                    # Shared test data
    ├── providers/               # Mock provider manifests
    │   ├── mock-openai.yaml
    │   └── mock-anthropic.yaml
    ├── responses/               # Recorded API responses
    │   ├── openai-chat-response.json
    │   ├── openai-stream-chunks.jsonl
    │   ├── anthropic-stream-chunks.jsonl
    │   └── error-responses/
    │       ├── openai-401.json
    │       ├── openai-429.json
    │       ├── anthropic-529.json
    │       └── gemini-resource-exhausted.json
    └── messages/                # Standardized test messages
        ├── simple-chat.json
        └── tool-call.json
```

## Test Case Format

Each test case is a YAML file with the following structure:

```yaml
# Test case metadata
suite: "error-classification"
name: "HTTP 429 maps to rate_limited"
id: "err-001"
description: "Verify that HTTP 429 is classified as rate_limited error"
tags: ["error", "classification", "P0"]

# Test setup
setup:
  provider: "mock-openai"            # Use fixture provider
  manifest_path: "fixtures/providers/mock-openai.yaml"

# Test input
input:
  type: "error_classification"       # Test operation type
  http_status: 429
  response_body:
    error:
      message: "Rate limit exceeded"
      type: "rate_limit_exceeded"
      code: "rate_limit_exceeded"

# Expected output
expected:
  error_code: "E2001"
  error_name: "rate_limited"
  retryable: true
  fallbackable: true
```

## Test Operation Types

| Type | Description | Input | Expected |
|------|-------------|-------|----------|
| `protocol_loading` | Load and validate a manifest | `manifest_path` | `valid: bool`, `errors: []` |
| `error_classification` | Classify an HTTP error response | `http_status`, `response_body` | `error_code`, `error_name`, etc. |
| `message_building` | Construct a request message | `messages`, `parameters` | `normalized_body` |
| `stream_decode` | Decode raw SSE/NDJSON chunks | `raw_chunks`, `decoder_config` | `events: []` |
| `event_mapping` | Map decoded frames to events | `frames`, `event_map` | `events: []` |
| `tool_accumulation` | Assemble partial tool calls | `partial_chunks` | `assembled_tool_calls` |
| `parameter_mapping` | Map standard to provider params | `standard_params`, `provider` | `provider_params` |
| `retry_decision` | Decide whether to retry an error | `error`, `retry_policy` | `should_retry`, `delay_ms` |
| `capability_guard` | Validate undeclared advanced capability blocking | `method`, `manifest` | `error_code` |
| `advanced_endpoint_mapping` | Resolve advanced operation endpoint | `operation`, `manifest` | `path`, `method` |
| `fallback_decision` | Decide advanced capability failover continuation | `operation`, `error_code` | `should_fallback` |
| `provider_mock_behavior` | Validate advanced request/response body contracts | `request_body`, `response_body` | `request_assert`, `response_assert` |

## Assertions

Each `expected` block supports these assertion types:

| Assertion | Description |
|-----------|-------------|
| `equals` | Exact value match (default) |
| `contains` | String contains / array includes |
| `matches` | Regex pattern match |
| `length` | Array/string length check |
| `type` | Type check (string, number, boolean, array, object) |
| `any_of` | Value is one of the listed options |
| `error` | Expected to produce an error |

Example with explicit assertions:

```yaml
expected:
  events:
    - assert: "length"
      value: 5
  events[0]:
    type:
      assert: "equals"
      value: "PartialContentDelta"
    content:
      assert: "contains"
      value: "Hello"
```

## Running Tests

### Rust Runner

```bash
cd ai-lib-rust
cargo test --test compliance -- --test-dir ../ai-protocol/tests/compliance
```

### Python Runner

```bash
cd ai-lib-python
pytest tests/compliance/ --compliance-dir ../ai-protocol/tests/compliance
```

### CI Integration

Both runtimes include the compliance suite in their CI pipelines:

```yaml
# .github/workflows/compliance.yml
- name: Run compliance tests
  run: |
    # Clone ai-protocol for test cases
    git clone --depth 1 https://github.com/ailib-official/ai-protocol.git
    # Run compliance tests
    cargo test --test compliance
```

## Adding New Test Cases

1. Choose the appropriate category directory under `cases/`.
2. Create a YAML file following the test case format.
3. Add any required fixtures under `fixtures/`.
4. Ensure the test passes in both Rust and Python runners.
5. Tag with appropriate priority (`P0`, `P1`, `P2`).

## Coverage Goals

| Category | Target Cases | Priority |
|----------|-------------|----------|
| Protocol Loading | 5+ | P0 |
| Error Classification | 8+ | P0 |
| Message Building | 4+ | P0 |
| Streaming | 6+ | P0 |
| Request Building | 3+ | P1 |
| Resilience | 4+ | P1 |
| **Total** | **30+** | — |

---

**End of Document**
