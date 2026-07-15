# Provider Identity (Normative)

> **Status**: Normative (PT-ARCH-005)  
> **Date**: 2026-07-15  
> **Closes**: Architecture Audit **F5** (`gemini` vs `google` drift)  
> **Does not**: mass-rename v1 LTS files in this task (see §3 tree rules)

## 1. Purpose

Across trees, Google Gemini has appeared as both `id: gemini` (v1 / v2-alpha) and
`id: google` (v2). Silent dual-identity breaks pins, compliance paths, and runtime
lookups. This document freezes **one canonical id**, an **explicit alias map**, and
per-tree rules so runtimes never invent a third id.

## 2. Canonical id + aliases

| Role | Value | Meaning |
|------|-------|---------|
| **Canonical provider id** | `google` | Evolution / v2+ primary id; matches `v2/providers/google.yaml` and `v2/contracts/*` `provider_id` |
| **Alias** | `gemini` | Historical / LTS nickname; MUST resolve to the same provider family as `google` |

**Rules**

1. Products and runtimes MUST treat `gemini` and `google` as the **same provider family**.
2. New manifests in **v2** (evolution) MUST use primary `id: google` and SHOULD declare
   `aliases: ["gemini"]` on that manifest.
3. Do **not** publish a second primary manifest in the **same tree** whose `id` is an
   alias of another primary (no silent dual identity).
4. Driver / adapter string names (e.g. streaming `adapter: "gemini"`) are **implementation
   labels**, not provider ids — they are out of scope for this alias map.

## 3. Per-tree rules (2026-07-15)

| Tree | File | Manifest `id` | Rule |
|------|------|---------------|------|
| **v1** (LTS wire) | `v1/providers/gemini.yaml` | `gemini` | Keep historical primary for wire stability. When a caller asks for `google` on the v1 tree, resolve via alias map → this manifest. |
| **v2** (evolution) | `v2/providers/google.yaml` | `google` | Canonical. Declare `aliases: ["gemini"]`. No `v2/providers/gemini.yaml`. |
| **v2-alpha** (sandbox) | `v2-alpha/providers/gemini.yaml` | `gemini` | Known divergence until graduation. Graduation target: primary `google` + `aliases: ["gemini"]`. Do not copy alpha dual-id into v2. |

Model registry rows under v1 (`v1/models/**` with `provider: gemini`) stay aligned with the
v1 provider file id until a dedicated model-registry migration.

## 4. Runtime lookup (migration note)

Recommended resolution order for a requested provider key `K`:

1. Exact match on manifest `id` in the loaded tree.
2. If no exact match: find a manifest whose `aliases` contains `K` (v2+).
3. If still none and the tree is **v1**: apply the Normative alias map — if `K == google`,
   load `id: gemini`; if `K == gemini`, load as today.
4. Else fail closed (unknown provider). Do **not** invent ids.

PROTO-PIN discipline still applies: document which tree was loaded ([`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md)).

## 5. Schema

Optional field on `schemas/v2/provider.json`:

```text
aliases: string[]   # alternate ids that resolve to this manifest's canonical `id`
```

Primary `id` remains required and unique within a tree.

## 6. Reviewer checklist

- [ ] No new primary id for Google Gemini other than `google` (v2+) or documented LTS `gemini` (v1)
- [ ] v2 google manifest lists `gemini` under `aliases`
- [ ] No second Google Gemini primary in the same tree without alias linkage
- [ ] Compliance / docs that cite provider ids note the alias when crossing trees

## 7. Non-goals

- Renaming all v1 model `provider: gemini` rows in this task
- Forcing four-runtime code changes in the same PR (runtimes follow §4 on their schedule)
- Treating streaming `adapter: "gemini"` as a provider id

## 8. Related

- [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md) — which tree to load  
- [`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md) — public vs overlay  
- [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) — logical specs  
- Architecture Audit — **F5**  
- Fixture: `v2/provider-identity.fixture.json` + `npm run validate:arch`  
