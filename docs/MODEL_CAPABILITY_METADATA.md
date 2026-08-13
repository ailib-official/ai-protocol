# Model capability metadata (Experimental)

> **PT-ME-001** · Plan ME-001 (ai-lib-plans, private) — Manifest enrichment from models.dev gap analysis  
> **PT-GEN-001** · Generative capability keys (image / STT / TTS) — Experimental extension of the same surface  
> **Schema**: [`schemas/v2/metadata-model-entry.json`](../schemas/v2/metadata-model-entry.json)  
> **Fixtures**: [`v2/metadata-model-entry.fixture.json`](../v2/metadata-model-entry.fixture.json), [`v2/metadata-model-entry-omit.fixture.json`](../v2/metadata-model-entry-omit.fixture.json), [`v2/metadata-model-entry-generative.fixture.json`](../v2/metadata-model-entry-generative.fixture.json)  
> **Status**: **Experimental** — not a stable Facade (GOV-006)

## 1. Purpose

Record **per-model** capability and modality facts under `metadata.models.<id>`.  
Same provider, different models often diverge (tool calling, reasoning, vision, media generation). Provider-level
`capabilities.required` / `optional` strings are **advertisements / coarse summaries**, not SoT
when model fields are present.

## 2. Fields (Experimental)

| Field | Meaning |
|-------|---------|
| `model_capabilities.tool_call` | Tool/function calling |
| `model_capabilities.structured_output` | JSON / schema-constrained output |
| `model_capabilities.reasoning` | Extended reasoning/thinking support |
| `model_capabilities.attachment` | Non-text attachments (prefer `modalities` when precise) |
| `model_capabilities.image_generation` | Text-to-image (or equivalent) generation (**PT-GEN-001**) |
| `model_capabilities.speech_to_text` | Speech-to-text / transcription (**PT-GEN-001**) |
| `model_capabilities.text_to_speech` | Text-to-speech synthesis (**PT-GEN-001**) |
| `modalities.input` / `.output` | `text` \| `image` \| `audio` \| `video` \| `pdf` |
| `reasoning_options` | Optional control shapes (may evolve) |
| `family` / `knowledge_cutoff` / `open_weights` | P1 metadata |

Existing capacity fields (`context_window`, `max_output_tokens`, `pricing`, `status`,
`verification`, informal `thinking` / `architecture`) remain.

**Vision vs generation:** `modalities.input` containing `image` (or `attachment: true`) means the model
*accepts* images. `image_generation: true` means the model *produces* images. Do not conflate them.

## 3. Semantics (normative for Experimental consumers)

1. **Omit = unknown.** Never serialize “unknown” as `false`.  
2. **Prefer model over ads.** If `model_capabilities` / `modalities` exist for a model id, use them for that model; do not assume provider `required`/`optional` apply uniformly.  
3. **Ads may drift.** Provider `capabilities.required` / `optional` need **not** equal the union/intersection of model flags (allowed inconsistency; model wins for that id).  
4. **`thinking` vs `reasoning`.** Boolean support → `model_capabilities.reasoning`; mode label → `thinking` (e.g. `dual_mode`).  
5. **L-Exec untouched for chat.** Provider `capabilities.tool_calling` dialects / streaming bindings stay Execution Spec. Generative **capability** keys are L-Cap facts; generative **endpoint** maps live in **PT-GEN-002** — [`GENERATIVE_LEXEC_ENDPOINTS.md`](./GENERATIVE_LEXEC_ENDPOINTS.md).  
6. **No Tag auto-map.** Do not equate `reasoning: true` with CapabilityTag `high-reasoning`.  
7. **Provenance.** Use existing `verification.source` enum only (no `models_dev` value).

## 3.1 Compliance gates (PT-ME-004 / PT-GEN-001)

`npm run validate:arch` enforces:

- Every v2 `category: ai_provider` has non-empty `metadata.models`
- `metadata-model-entry-omit.fixture.json` validates (capacity-only; no `model_capabilities`)
- Full entry fixture still validates when capabilities present
- Generative fixture validates when only PT-GEN-001 keys are asserted (chat flags may be omitted)

Aggregator (`third_party_aggregator`) is **not** in this baseline gate.

## 4. Logical layer

| Concern | Layer |
|---------|-------|
| `metadata.models.*.model_capabilities` / `modalities` | **L-Cap** (model fact) |
| Provider `capabilities.required` / `optional` | L-Cap **ads** (non-SoT when model fields present) |
| `capabilities.tool_calling` wire dialects | **L-Exec** |
| `endpoints.image_generation` / `speech_to_text` / `text_to_speech` | **L-Exec** ([`GENERATIVE_LEXEC_ENDPOINTS.md`](./GENERATIVE_LEXEC_ENDPOINTS.md)) |

See [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md).

## 5. GOV-006 (this surface)

| # | Question | Verdict |
|---|----------|---------|
| 1 | SemVer-stable until next major? | **defer** — Experimental; shape may tighten (ME-001 backfill + PT-GEN generative keys) |
| 2 | Exposes replaceable internals? | **no** — vendor-neutral model facts |
| 3 | Experimental first? | **yes** |
| 4 | Higher abstraction exists? | **yes** — extend `metadata.models` (PT-075 / PT-GEN-001), do not invent parallel generative ads API |

## 6. Related

- ME-001 plan + PT-ME-000 survey (ai-lib-plans)  
- Generative plan: GENERATIVE-CAPABILITY-ABSTRACTION-2026-08-12 (ai-lib-plans) · **PT-GEN-001**  
- [`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md)  
- Baseline backfill: PT-ME-003 (separate)  
- **Oneshot candidate helper (PT-ME-002)**: [`ME001_ONESHOT_CANDIDATE.md`](./ME001_ONESHOT_CANDIDATE.md) — local models.dev dump → advisory candidates; not SoT  
