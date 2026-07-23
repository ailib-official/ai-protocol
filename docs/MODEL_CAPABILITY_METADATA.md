# Model capability metadata (Experimental)

> **PT-ME-001** · Plan ME-001 (ai-lib-plans, private) — Manifest enrichment from models.dev gap analysis  
> **Schema**: [`schemas/v2/metadata-model-entry.json`](../schemas/v2/metadata-model-entry.json)  
> **Fixture**: [`v2/metadata-model-entry.fixture.json`](../v2/metadata-model-entry.fixture.json)  
> **Status**: **Experimental** — not a stable Facade (GOV-006)

## 1. Purpose

Record **per-model** capability and modality facts under `metadata.models.<id>`.  
Same provider, different models often diverge (tool calling, reasoning, vision). Provider-level
`capabilities.required` / `optional` strings are **advertisements / coarse summaries**, not SoT
when model fields are present.

## 2. Fields (Experimental)

| Field | Meaning |
|-------|---------|
| `model_capabilities.tool_call` | Tool/function calling |
| `model_capabilities.structured_output` | JSON / schema-constrained output |
| `model_capabilities.reasoning` | Extended reasoning/thinking support |
| `model_capabilities.attachment` | Non-text attachments (prefer `modalities` when precise) |
| `modalities.input` / `.output` | `text` \| `image` \| `audio` \| `video` \| `pdf` |
| `reasoning_options` | Optional control shapes (may evolve) |
| `family` / `knowledge_cutoff` / `open_weights` | P1 metadata |

Existing capacity fields (`context_window`, `max_output_tokens`, `pricing`, `status`,
`verification`, informal `thinking` / `architecture`) remain.

## 3. Semantics (normative for Experimental consumers)

1. **Omit = unknown.** Never serialize “unknown” as `false`.  
2. **Prefer model over ads.** If `model_capabilities` / `modalities` exist for a model id, use them for that model; do not assume provider `required`/`optional` apply uniformly.  
3. **`thinking` vs `reasoning`.** Boolean support → `model_capabilities.reasoning`; mode label → `thinking` (e.g. `dual_mode`).  
4. **L-Exec untouched.** Provider `capabilities.tool_calling` dialects / streaming bindings stay Execution Spec.  
5. **No Tag auto-map.** Do not equate `reasoning: true` with CapabilityTag `high-reasoning`.  
6. **Provenance.** Use existing `verification.source` enum only (no `models_dev` value).

## 4. Logical layer

| Concern | Layer |
|---------|-------|
| `metadata.models.*.model_capabilities` / `modalities` | **L-Cap** (model fact) |
| Provider `capabilities.required` / `optional` | L-Cap **ads** (non-SoT when model fields present) |
| `capabilities.tool_calling` wire dialects | **L-Exec** |

See [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md).

## 5. GOV-006 (this surface)

| # | Question | Verdict |
|---|----------|---------|
| 1 | SemVer-stable until next major? | **defer** — Experimental; shape may tighten with ME-001 backfill |
| 2 | Exposes replaceable internals? | **no** — vendor-neutral model facts |
| 3 | Experimental first? | **yes** |
| 4 | Higher abstraction exists? | **yes** — extend `metadata.models` (PT-075), do not invent parallel model registry API |

## 6. Related

- ME-001 plan + PT-ME-000 survey (ai-lib-plans)  
- [`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md)  
- Baseline backfill: PT-ME-003 (separate)  
