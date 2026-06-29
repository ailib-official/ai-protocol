# Content Block Encoding — Document

> **Task**: PT-079-R1  
> **Status**: draft  
> **Schema**: `schemas/v2/provider-contract.json` → `request_mapping.content_block_mapping.document`

## Purpose

Declare how unified `ContentBlock::Document` maps to provider wire JSON. Runtimes MUST NOT hardcode vendor shapes in application layers (ARCH-001). Encoder execution lives in ai-lib driver/manifest pipeline (ALR-DOC-002); Eos P-layer `document_attach` encode is interim debt retired by EOS-P2-008.

## Unified input (ai-lib)

| Field | Type | Notes |
|-------|------|-------|
| `source_type` | `base64` \| `url` \| `ref` | `ref` MUST be resolved before encode unless contract sets `ref_resolution: resolve_at_runtime` |
| `data` | string | Base64 payload, URL, or staging ref |
| `mime_type` | string? | Defaults per contract `default_mime_type` (typically `application/pdf`) |
| `filename` | string? | Metadata only; not sent on all providers |

Capability gate: manifest `multimodal.input.vision.document_understanding` (ALR-DOC-001). Encoding is separate from capability declaration.

## Contract fields

| Field | Description |
|-------|-------------|
| `format` | Wire family: `anthropic_document`, `gemini_inline_data`, `openai_file` |
| `source_wrapper` | Nested object style for source payloads |
| `base64_field` / `mime_type_field` | Relative paths within encoded block |
| `type_field` | Top-level type discriminator when required (Anthropic `document`) |
| `default_mime_type` | Fallback when unified block omits MIME |
| `ref_resolution` | `error_before_encode` (default) — encoder rejects `ref` |
| `supported` | `false` to mark api_style without native document blocks |

## Reference contracts

| API style | Contract file | Document wire shape |
|-----------|---------------|---------------------|
| `anthropic_messages` | `v2/contracts/anthropic-messages.contract.yaml` | `{ type: document, source: { type, media_type, data } }` |
| `gemini_generate` | `v2/contracts/gemini-generate.contract.yaml` | `{ inlineData: { mimeType, data } }` |

## Golden examples (base64 PDF)

### Anthropic

```json
{
  "type": "document",
  "source": {
    "type": "base64",
    "media_type": "application/pdf",
    "data": "<base64>"
  }
}
```

### Gemini

```json
{
  "inlineData": {
    "mimeType": "application/pdf",
    "data": "<base64>"
  }
}
```

## Compliance

- CI: `npm run validate` validates `v2/contracts/*.yaml` against `provider-contract.json`.
- Runtime: `content_block_encode` compliance suite (ALR-DOC-002-R3) consumes these contracts.

## Related tasks

- ALR-DOC-001 — `ContentBlock::Document` + interim driver encode
- EOS-P2-007 — Eos staging + `document_attach` interim path
- PT-079 / ALR-DOC-002 / EOS-P2-008 — declarative encoder + P-layer retirement
