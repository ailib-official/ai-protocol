# Generative L-Exec endpoints (Experimental)

> **PT-GEN-002** · Companion to [MODEL_CAPABILITY_METADATA.md](./MODEL_CAPABILITY_METADATA.md) (PT-GEN-001)  
> **Schema**: [`schemas/v2/generative-endpoint-entry.json`](../schemas/v2/generative-endpoint-entry.json)  
> **Fixture**: [`v2/generative-endpoint-entry.fixture.json`](../v2/generative-endpoint-entry.fixture.json)  
> **Status**: **Experimental** — not a stable Facade (GOV-006)

## 1. Purpose

Tell runtimes **where and how** to call generative HTTP surfaces from the
manifest (**L-Exec**), without baking vendor path strings into product shells
(Eos / VelaClaw / Gateway). Capability *whether* lives in L-Cap
(`model_capabilities.image_generation` / `speech_to_text` / `text_to_speech`);
capability *how* lives here.

OpenAI mappings in this repo are an **adapter sample**, not the unique contract
(GOV-007 / ARCH-001).

## 2. Preferred lookup keys

Under provider `endpoints`, use the **same names** as PT-GEN-001 capability keys:

| Key | Typical op | Flat `endpoint.*` shortcut (legacy / optional) |
|-----|------------|-----------------------------------------------|
| `image_generation` | text → image | `endpoint.images` |
| `speech_to_text` | audio → text | `endpoint.stt` |
| `text_to_speech` | text → audio | `endpoint.tts` |

Runtimes SHOULD resolve `endpoints.<key>` first. Flat `endpoint.stt` /
`endpoint.tts` / `endpoint.images` remain valid path shortcuts for older
consumers; do not invent a second execution dialect.

## 3. Entry shape (Experimental)

Each `endpoints.<key>` object MAY include:

| Field | Required | Meaning |
|-------|----------|---------|
| `path` | yes | Relative to `endpoint.base_url` |
| `method` | yes | HTTP method |
| `adapter` | no | Wire adapter id (e.g. `openai`) |
| `request_encoding` | no | `json` \| `multipart` \| `form` — omit = unknown |
| `response_encoding` | no | `json` \| `binary` \| `sse` — omit = unknown |
| `notes` | no | Human only |

`additionalProperties` is **false** on the Experimental entry schema so shape
drift is caught in fixtures; the parent `provider.endpoints` map remains
open (`additionalProperties: true`) so chat/embeddings entries stay valid.

## 4. OpenAI adapter sample (not SoT uniqueness)

Documented in `v2/providers/openai.yaml`:

| Key | path | method | request_encoding | response_encoding |
|-----|------|--------|------------------|-------------------|
| `image_generation` | `/images/generations` | POST | json | json |
| `speech_to_text` | `/audio/transcriptions` | POST | multipart | json |
| `text_to_speech` | `/audio/speech` | POST | json | binary |

Flat shortcuts: `endpoint.images`, `endpoint.stt`, `endpoint.tts` (unchanged
semantics for STT/TTS; `images` added in PT-GEN-002).

## 4.1 Stage D second vendor (PT-GEN-003)

`v2/providers/qwen.yaml` seeds **Qwen / DashScope** as a non-OpenAI dialect:

| Key | path | adapter | Notes |
|-----|------|---------|-------|
| `image_generation` | absolute `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation` | `dashscope` | Not under `compatible-mode` chat base; body is native `input.messages`, not OpenAI `prompt` |

Model fact: `metadata.models.qwen-image-plus.model_capabilities.image_generation: true`.

A second vendor proves Stage D — different path/encoding under the **same** keys.

## 5. Semantics

1. **L-Cap first.** Missing `model_capabilities.<key>` (omit) ≠ false; do not
   call the endpoint solely because `endpoints.<key>` exists.
2. **No `if provider == openai`.** Read path/encoding from the manifest.
3. **Chat L-Exec unchanged.** `tool_calling` / streaming bindings are out of scope.
4. **No drivers here.** HTTP clients land in ALR-GEN-002 (and parity tasks).
5. **No Policy.** Host allowlists / spend caps stay in application overlay
   ([MANIFEST_LOGICAL_LAYERS.md](./MANIFEST_LOGICAL_LAYERS.md)).

## 6. Logical layer

| Concern | Layer |
|---------|-------|
| `model_capabilities.image_generation` / STT / TTS | **L-Cap** |
| `endpoints.image_generation` / … + flat `endpoint.images`/`stt`/`tts` | **L-Exec** |
| Host allow / spend / product default models | **L-Pol** (overlay) |

## 7. GOV-006 (this surface)

| # | Question | Verdict |
|---|----------|---------|
| 1 | SemVer-stable until next major? | **no** — Experimental L-Exec map |
| 2 | Exposes replaceable internals? | **no** — declarative endpoints only |
| 3 | Experimental first? | **yes** |
| 4 | Higher abstraction exists? | **yes** — extend existing `endpoints` map; no parallel proxy dialect |

## 8. Related

- Plan: GENERATIVE-CAPABILITY-ABSTRACTION-2026-08-12 (ai-lib-plans)  
- PT-GEN-001 · [MODEL_CAPABILITY_METADATA.md](./MODEL_CAPABILITY_METADATA.md)  
- [MANIFEST_LOGICAL_LAYERS.md](./MANIFEST_LOGICAL_LAYERS.md)  
- Drivers: ALR-GEN-002 (ai-lib-rust)  
