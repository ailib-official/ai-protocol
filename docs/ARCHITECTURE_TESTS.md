# Architecture Tests (PT-ARCH-008 pilot)

> **Status**: Pilot (F11)  
> **Entry**: `npm run validate:arch` (after `npm run build`)

## What this pilot asserts

| Gate | Purpose |
|------|---------|
| **Vocabulary freeze** | `v2/capability-tag-mapping.fixture.json` `capability_tag` set matches `v2/architecture/capability-tag-freeze.snapshot.json` |
| **Policy Spec deny** | Public provider YAML must not introduce host Policy Spec top-level keys (PT-ARCH-004 §4.2) |
| **Experimental facade freeze** | Envelope + Tag mapping fixtures stay `status: experimental` with frozen required top-level keys |

## Updating snapshots

Intentional vocabulary / Experimental shape changes require:

1. Update the fixture(s)
2. Update the matching snapshot under `v2/architecture/`
3. Cite F-ID / Protocol Proposal in the PR (GOV-006 for stable consume fields)

## Related

- PT-ARCH-007 / F9: [`ERROR_CONTRACT_NAMES.md`](./ERROR_CONTRACT_NAMES.md) — contract names ↔ E codes (also loaded by `validate:arch`)
- PT-ARCH-010 / F12: [`PACK_CONTRACT_BOUNDARIES.md`](./PACK_CONTRACT_BOUNDARIES.md) — Pack / ProviderContract resolve gates in `validate:arch`
- PT-ARCH-011 / F8: [`CAPABILITY_CATALOG.md`](./CAPABILITY_CATALOG.md) — Catalog skeleton coverage in `validate:arch`
- PT-ARCH-004: [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md)
