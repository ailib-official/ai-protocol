# Generative Capabilities: Four-Runtime Semantic Alignment Matrix

> Status: Active baseline (Wave-4, PT-058)
> Last Updated: 2026-03-30
> Scope: ai-lib-rust, ai-lib-python, ai-lib-ts, ai-lib-go

## 1. Purpose

This document defines the semantic alignment contract for generative LLM
capabilities across all four runtimes. Each runtime MUST produce semantically
equivalent output for the same protocol input, as verified by the shared
`08-generative-capabilities` compliance fixture set.

## 2. Alignment Dimensions

### 2.1 Message Building

| Behavior | Rust | Python | TypeScript | Go | Compliance Case |
|----------|------|--------|------------|-----|-----------------|
| System role message handling | Required | Required | Required | Required | gen-003 |
| Multi-turn context construction | Required | Required | Required | Required | gen-001 |
| Structured output mode activation (json_mode/json_schema) | Required | Required | Required | Required | gen-003 |
| Tool definition injection (OpenAI/Anthropic/Gemini formats) | Required | Required | Required | Required | gen-004 |
| MCP tool bridge request format | Required | Required | Required | Required | gen-007 |

### 2.2 Streaming Decode

| Behavior | Rust | Python | TypeScript | Go | Compliance Case |
|----------|------|--------|------------|-----|-----------------|
| SSE event parsing to unified StreamingEvent | Required | Required | Required | Required | gen-004 |
| Partial tool-call argument accumulation | Required | Required | Required | Required | gen-004 |
| Reasoning/thinking block extraction | Required | Required | Required | Required | gen-006 |
| Token usage in stream (when feature_flags.streaming_usage=true) | Required | Required | Required | Required | gen-002 |
| Chunk-level error propagation | Required | Required | Required | Required | gen-005 |

### 2.3 Token Usage Reporting

| Behavior | Rust | Python | TypeScript | Go | Compliance Case |
|----------|------|--------|------------|-----|-----------------|
| prompt_tokens extraction | Required | Required | Required | Required | gen-002 |
| completion_tokens extraction | Required | Required | Required | Required | gen-002 |
| total_tokens extraction | Required | Required | Required | Required | gen-002 |
| reasoning_tokens extraction | Required | Required | Required | Required | gen-002 |
| Provider-variant usage field normalization | Required | Required | Required | Required | gen-002 |

### 2.4 Error Classification (Generative-specific)

| Behavior | Rust | Python | TypeScript | Go | Compliance Case |
|----------|------|--------|------------|-----|-----------------|
| Context window overflow → E1005 (request_too_large) | Required | Required | Required | Required | gen-005 |
| Content filter trigger → E1006 | Required | Required | Required | Required | (future) |
| Rate limit with Retry-After parsing | Required | Required | Required | Required | 06-resilience |

### 2.5 Capability Gating

| Behavior | Rust | Python | TypeScript | Go | Compliance Case |
|----------|------|--------|------------|-----|-----------------|
| Undeclared capability → E1005 fail-fast | Required | Required | Required | Required | gen-007 |
| Feature flag conditional behavior | Required | Required | Required | Required | gen-001 |

## 3. Runtime-specific Implementation Notes

### ai-lib-rust
- Manifest consumption via ProtocolLoader
- Streaming via async Stream trait
- Token usage via unified Usage struct
- Generative compliance tests in `tests/generative_manifest_consumption.rs`

### ai-lib-python
- Manifest consumption via protocol_loader module
- Streaming via async generator
- Token usage via Usage dataclass
- Generative compliance tests in `tests/compliance/test_generative.py`

### ai-lib-ts
- Manifest consumption via ProtocolLoader class
- Streaming via AsyncIterator/ReadableStream
- Token usage via Usage interface
- Generative compliance tests in `tests/compliance/generative.test.ts`

### ai-lib-go
- Manifest consumption via loader package
- Streaming via channel-based decoder
- Token usage via Usage struct
- Generative compliance tests in `compliance/generative_test.go`
- **Catch-up allowance**: Go runtime may lag by one sprint on reasoning_tokens
  and MCP bridge features; must document ETA when PT-058 closes.

## 4. Compliance Gate Integration

The `08-generative-capabilities` compliance cases (gen-001 through gen-007)
are included in the `gate:compliance-matrix` runner. All four runtimes must
pass the shared fixture set for the gate to report green.

```bash
npm run gate:compliance-matrix -- --include 08-generative-capabilities
```

## 5. Verification Baseline

| Runtime | Generative Compliance Status | Date |
|---------|------------------------------|------|
| Rust | Pending | - |
| Python | Pending | - |
| TypeScript | Pending | - |
| Go | Pending | - |

This table is updated as each runtime passes the generative compliance suite.
