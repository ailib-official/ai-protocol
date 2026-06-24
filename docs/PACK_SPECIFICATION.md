# Prism Pack Specification (AI-Protocol V2 extension)

> **Status**: Draft contract (PR-PP-001)  
> **Scope**: Schema + example only — **no** marketplace, registry, or runtime loader in Phase 2.

## Overview

A **Pack** is a portable manifest that describes a curated set of `provider` + `model` routes for Prism-style smart routing (`POST /v1/route/decide`). Packs extend the ai-protocol v2 ecosystem by referencing existing [provider manifests](../v2/providers/) rather than duplicating endpoint or capability definitions.

```
ai-protocol v2 provider manifest  →  defines provider id, models, pricing metadata
ai-protocol v2 pack manifest      →  defines route bundle + optimize defaults
Prism gateway / prism-core        →  consumes routes at runtime (future; not part of PR-PP-001)
```

## Schema

- **JSON Schema**: [`schemas/v2/pack.json`](../schemas/v2/pack.json)
- **Draft**: JSON Schema 2020-12
- **Required fields**: `id`, `name`, `version`, `protocol_version`, `provider_routes`

### Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable pack id (`^[a-z0-9][a-z0-9-_]{1,63}$`) |
| `name` | string | Display name |
| `version` | string | Pack SemVer |
| `protocol_version` | `"2.0"` | ai-protocol major version |
| `description` | string | Optional summary |
| `status` | `draft` \| `stable` \| `deprecated` | Lifecycle |
| `optimize_default` | `cost` \| `latency` \| `balanced` | Default for `/v1/route/decide` |
| `provider_routes` | array | Route entries (see below) |
| `signing_info` | object | Optional publisher signature (registry TBD) |
| `metadata` | object | Publisher tags, docs links, billing hints |

### `provider_routes[]`

Each entry selects a route within the ai-protocol provider registry:

| Field | Required | Description |
|-------|----------|-------------|
| `provider` | yes | Provider manifest `id` (e.g. `deepseek`) |
| `model` | yes | Model key from provider `metadata.models` |
| `priority` | yes | Integer rank; `0` = primary |
| `cost_weight` | no | `0..1` weight for balanced mode |
| `capability_tags` | no | Tags for capability filtering |
| `notes` | no | Publisher notes (aliases, SLA caveats) |

### Relationship to v2 provider manifests

- Pack `provider` values **must** match a `v2/providers/<provider>.yaml` `id`.
- Pack `model` values **should** match keys under that provider's `metadata.models`.
- Packs do **not** embed `$ref` to full provider.json — consumers resolve manifests separately (same as multi-provider routing today).

### `signing_info` (optional)

Reserved for a future signed pack registry. Fields: `publisher`, `signed_at`, `algorithm`, `public_key_id`, `signature`. Draft packs may omit this block entirely.

## Example

See [`v2/packs/examples/deepseek-economy-pack.json`](../v2/packs/examples/deepseek-economy-pack.json):

- Primary: `deepseek` / `deepseek-chat` (cost optimize)
- Reasoning fallback: `deepseek` / `deepseek-reasoner`
- Cross-provider fallback: `groq` / `llama-3.1-8b-instant`

The example includes `metadata.sla: "NOT PRODUCTION SLA"` — cost routing and pack selection remain **best-effort** until product SLA policies are defined (see Prism `PR-PP-002`).

## Validation

```bash
npm run validate:packs
# or full suite:
npm run validate
```

CI runs `npm run validate`, which includes pack example validation when `v2/packs/**/*.json` exists.

## Out of scope (Phase 2)

- Pack marketplace or install UX
- Runtime pack loader in prism-core / ai-lib-gateway
- Signature verification service
- Pack versioning / upgrade migrations

Phase 3 may add registry + signed distribution; this document defines the **contract only**.

## References

- Prism task: `ai-lib-plans/active/projects/prism/tasks/PR-PP-001-pack-contract-draft.yaml`
- Cost routing: Prism `docs/PR-PP-002-IMPLEMENTATION.md`
- Provider schema: [`schemas/v2/provider.json`](../schemas/v2/provider.json)
