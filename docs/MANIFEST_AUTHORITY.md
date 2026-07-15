# Manifest Authority — Public Protocol vs Application Overlays

> Governance: [TEST-002](https://github.com/ailib-official/ai-lib-constitution/blob/main/rules/testing/TEST-002-public-url-reference-hygiene.yaml), [GOV-003](https://github.com/ailib-official/ai-lib-constitution/blob/main/rules/governance/GOV-003-pr-review-discipline.yaml), [ARCH-001](https://github.com/ailib-official/ai-lib-constitution/blob/main/rules/architecture/ARCH-001-protocol-driven-design.yaml)

## Principle

**`ailib-official/ai-protocol` manifests are the single public authority** for provider wire format, capabilities, and model capacity metadata consumed by ai-lib runtimes.

**Logical layers** (Capability Spec / Execution Spec / Policy Spec) are Normative in
[`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) (PT-ARCH-004). Policy Spec and
product defaults stay in **application overlay**, not public YAML.

Applications (Eos, VelaClaw, ai-lib-gateway, etc.) **must not** require special fields, provenance tags, or deployment notes in public manifests. If an application needs:

- default model subsets for a region or deployment
- smoke-test results from a private VPS
- product-specific model allowlists

…those belong in **application-internal configuration or overlay**, not in ai-protocol YAML/JSON.

## What belongs in public manifests

| Allowed | Examples |
|---------|----------|
| Provider wire contract | `endpoint`, `streaming`, `error_classification` |
| Declared capabilities | `capabilities`, `feature_flags`, `capability_profile` |
| Model capacity | `metadata.models.context_window`, `max_output_tokens` |
| Public provenance | `verification` with allowed `source` values (below) |
| Regional availability | `availability.regions`, `approval_ids` (compliance registry) |

## What does **not** belong

| Forbidden | Why |
|-----------|-----|
| `verification.source: eos` / `velaclaw-trial` / product codenames | Conflates private deployment with protocol truth |
| `hiddenpath/*` URLs or org names in any field | [TEST-002] public URL hygiene |
| PR numbers, git SHAs, “HK deployment”, “Eos default” in `notes` | Internal ops evidence → `ai-lib-plans/MEMORY.md` or app config |
| App-specific default model lists | Use app overlay (e.g. Eos `config.rs` until manifest consumption lands) |

## `verification.source` (allowed values)

Defined in `schemas/v2/metadata-model-entry.json`:

| Value | Use when |
|-------|----------|
| `official_documentation` | Field values match vendor docs or API reference |
| `api_probe` | Values confirmed by live API call (no app/deployment name in notes) |
| `compliance_registry` | Model listed in `ai-lib-plans/data/compliance/registered_models.yaml` |
| `provider_catalog` | Listed in provider `/models` or public catalog API |

`verification` is **optional**. Omit it when capacity/pricing already comes from official docs and no extra provenance is needed.

## Application overlay pattern (P2)

```
┌─────────────────────────────┐
│  ailib-official/ai-protocol │  ← public authority (runtimes + compliance)
└──────────────┬──────────────┘
               │ load
       ┌───────┴────────┐
       ▼                ▼
 ai-lib-rust/python   Application (Eos, gateway, …)
                      └── internal overlay: defaults, region filter,
                          deployment smoke-test cache (never written back
                          to public manifest)
```

Runtimes read manifests as-is. Applications may **filter** or **annotate locally** at serve time; they must not push deployment state into the public repo.

## Version trees (which tree to load)

See **[`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md)** (PT-ARCH-001):

- **Production default wire**: `v1` (`authority.lts_wire` / `production_default`)
- **`latest` in `dist/index.json`**: evolution tip (`v2`) — **not** production default
- **Sandbox**: `v2-alpha` — explicit opt-in only

## CI enforcement

`npm run gate:manifest-authority` scans `v1/`, `v2/`, `v2-alpha/`, and `dist/` for:

- forbidden URL patterns (`hiddenpath`, etc.)
- disallowed `verification.source` values
- deployment-specific note patterns (PR refs, commit SHAs, product default markers)

Wired into `validate` workflow and `gate-fullchain.js`.

## Contributing checklist

- [ ] No product/deployment names in `verification.source` or `notes`
- [ ] No `hiddenpath` strings anywhere in manifest tree
- [ ] `verification.source` is one of the four allowed enum values (if present)
- [ ] Deployment-specific decisions recorded in `ai-lib-plans` (private), not here
