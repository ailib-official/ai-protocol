# Provider Survey Template

> 用途：为每个供应商建立一份“可追溯的规则证据”记录，并直接导出对 `ai-protocol` 的结构化改动建议。

## Provider
- **id**: (e.g. openai / anthropic / gemini / groq / deepseek / qwen)
- **Status**: draft | verified | needs_review
- **Protocol target**: v1.x (stable) / v2-alpha

## Official Docs (Sources)
- **API overview**:
- **Auth**:
- **Chat/Message endpoint**:
- **Streaming**:
- **Tools / function calling**:
- **Errors**:
- **Rate limits / quotas**:
- **Structured output / JSON schema**:

> 记录规则时请附：页面标题 + URL + 关键段落摘录（原文） + 我们的归并结论

## Extracted Rules (What the runtime MUST do)

### 1) Endpoint + Request
- **base_url**:
- **paths**:
- **request body shape**:
- **required headers**:
- **parameter semantics**:

### 2) Response + Usage
- **response shape**:
- **content extraction**:
- **tool call shape**:
- **usage fields**:
- **finish/stop reasons**:

### 3) Streaming
- **wire format**:
- **frame boundary**:
- **event types**:
- **delta merge rules**:
- **tool args accumulation**:

### 4) Errors + Retry
- **error object**:
- **retryable rules**:
- **rate limit headers**:
- **idempotency**:

## Mapping to ai-protocol (Proposed)

### Provider YAML (`v1/providers/{id}.yaml`)
- **fields to add/change**:

### Spec (`v1/spec.yaml`)
- **new standard fields**:
- **new enums**:

### Schema (`schemas/v1.json`)
- **new properties**:
- **new enums / oneOf**:

## Notes / Open Questions
- (待确认项列表)


