# Provider Identity (Normative)

> **Status**: Normative (PT-ARCH-005)  
> **Date**: 2026-07-15  
> **Closes**: Architecture Audit **F5** (`gemini` vs `google` drift)  
> **Decision**: Option A — canonical `gemini`, alias `google` (official API product name)

## 1. Purpose

Across trees, Google’s Gemini API surface has appeared as both `id: gemini`
(v1 / v2-alpha) and `id: google` (v2). Silent dual-identity breaks pins,
compliance paths, and runtime lookups. This document freezes **one canonical
id**, an **explicit alias map**, and per-tree rules so runtimes never invent a
third id.

## 2. Evidence (official product contract)

Canonical id follows the **API product** name, not the org / SDK package prefix.

| Signal | Official source | Observation |
|--------|-----------------|-------------|
| Product docs | [Gemini API](https://ai.google.dev/gemini-api/docs) | Product surface is **Gemini API** |
| HTTP host | `generativelanguage.googleapis.com` | Matches current manifests’ `endpoint.base_url` |
| Model ids | `gemini-*` | Wire model names are Gemini-branded |
| Auth env | `GEMINI_API_KEY` | Manifest `token_env` already uses Gemini |
| SDK namespace | `@google/genai` / `GoogleGenAI` | Org / package prefix — **alias signal**, not product id |

**Rule:** `provider.id` = official **API product** contract name (`gemini`).
`google` remains a compatibility alias for callers that used the org label.

## 3. Canonical id + aliases

| Role | Value | Meaning |
|------|-------|---------|
| **Canonical provider id** | `gemini` | Evolution / v2+ primary id; matches `v2/providers/gemini.yaml` and `v2/contracts/*` `provider_id` |
| **Alias** | `google` | Org / historical nickname; MUST resolve to the same provider family as `gemini` |

**Rules**

1. Products and runtimes MUST treat `gemini` and `google` as the **same provider family**.
2. New manifests in **v2** (evolution) MUST use primary `id: gemini` and SHOULD declare
   `aliases: ["google"]` on that manifest.
3. Do **not** publish a second primary manifest in the **same tree** whose `id` is an
   alias of another primary (no silent dual identity).
4. Driver / adapter string names (e.g. streaming `adapter: "gemini"`) are **implementation
   labels**, not provider ids — they are out of scope for this alias map.
5. Compliance **mock** fixture ids (e.g. `mock-google-v2.yaml` with `id: google`) are
   test doubles, not the Gemini API primary in `v2/providers/`.

## 4. Per-tree rules (2026-07-15)

| Tree | File | Manifest `id` | Rule |
|------|------|---------------|------|
| **v1** (LTS wire) | `v1/providers/gemini.yaml` | `gemini` | Already aligned with canonical. When a caller asks for `google` on the v1 tree, resolve via alias map → this manifest. |
| **v2** (evolution) | `v2/providers/gemini.yaml` | `gemini` | Canonical. Declare `aliases: ["google"]`. No `v2/providers/google.yaml`. |
| **v2-alpha** (sandbox) | `v2-alpha/providers/gemini.yaml` | `gemini` | Already aligned. Graduation: keep primary `gemini`; ensure `aliases: ["google"]` when promoting overlay fields. Do not reintroduce `google` as a second primary. |

Model registry rows under v1 (`v1/models/**` with `provider: gemini`) stay aligned with the
v1 provider file id until a dedicated model-registry migration.

## 5. Runtime lookup (migration note)

Recommended resolution order for a requested provider key `K`:

1. Exact match on manifest `id` in the loaded tree.
2. If no exact match: find a manifest whose `aliases` contains `K` (v2+).
3. If still none and the tree is **v1**: apply the Normative alias map — if `K == google`,
   load `id: gemini`; if `K == gemini`, load as today.
4. Else fail closed (unknown provider). Do **not** invent ids.

PROTO-PIN discipline still applies: document which tree was loaded ([`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md)).

## 6. Schema

Optional field on `schemas/v2/provider.json`:

```text
aliases: string[]   # alternate ids that resolve to this manifest's canonical `id`
```

Primary `id` remains required and unique within a tree.

**Do not** introduce parallel wire keys such as `canonical_id` + `provider_slug`.
Org vs product naming is expressed as **`id` (API product) + `aliases` (compat /
org nicknames)**. Optional non-resolve metadata (for example a future `vendor`
label) may be proposed separately; it MUST NOT participate in lookup.

## 7. Registry gates (`npm run validate:arch`)

Applied to `v1/providers`, `v2/providers`, and `v2-alpha/providers`:

1. Filename stem MUST equal manifest `id` (no `google.yaml` with `id: gemini`).
2. `id` MUST be unique within the tree.
3. Each `aliases` entry MUST NOT equal the manifest's own `id`.
4. An alias MUST NOT collide with another primary `id` in the same tree.
5. An alias MUST NOT be claimed by two different primaries in the same tree.
6. A file stem/id MUST NOT equal an alias owned by a different primary
   (no silent dual-identity).
7. Gemini family (Option A): no `google.yaml` primary in v2 / v2-alpha;
   `gemini.yaml` MUST list `aliases: [google]`; fixture `canonical_id=gemini`.

New provider ids MUST be introduced as a new primary `id` (new file) or as an
`aliases` entry on an existing primary — never as an undocumented second name.

Compliance **mock** fixtures under `tests/compliance/fixtures/` are out of
scope for these tree gates (test doubles).

## 8. Reviewer checklist

- [ ] No new primary id for Gemini API other than `gemini` (v2+) / documented LTS `gemini` (v1)
- [ ] v2 / v2-alpha gemini manifests list `google` under `aliases`
- [ ] No `google.yaml` primary alongside `gemini` in v2 / v2-alpha
- [ ] Contracts for Gemini generate use `provider_id: gemini`
- [ ] `npm run validate:arch` registry gates pass
- [ ] Compliance / docs that cite provider ids note the alias when crossing trees
- [ ] No new wire fields that duplicate `id` / `aliases` resolve semantics

## 9. Non-goals

- Renaming all v1 model `provider: gemini` rows in this task (already aligned)
- Renaming compliance mock fixture ids that are not the real Gemini API primary
- Forcing four-runtime code changes in the same PR (runtimes follow §5 on their schedule)
- Treating streaming `adapter: "gemini"` or SDK package `@google/genai` as the provider id
- Adding `canonical_id` / `provider_slug` (or similar) parallel primary keys

## 10. Related

- [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md) — which tree to load  
- [`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md) — public vs overlay  
- [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) — logical specs  
- Architecture Audit — **F5**  
- Fixture: `v2/provider-identity.fixture.json` + `npm run validate:arch`  
