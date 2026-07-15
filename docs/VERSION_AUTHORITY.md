# Version Authority Ladder (Normative)

> **Status**: Normative (PT-ARCH-001)  
> **Date**: 2026-07-14  
> **Closes**: Architecture Audit F1 / F7  
> **Cadence**: Selective freeze -- this doc is Architecture phase B; it does **not** authorize four-runtime upgrade waves.

## 1. Purpose

`ai-protocol` ships three concurrent trees (`v1`, `v2`, `v2-alpha`). Without an explicit ladder, `dist/index.json` `"latest": "v2"` is easy to misread as "production default," while most runtime pins and coverage still live on **v1**.

This document is the **Normative authority ladder**. Runtimes and applications must follow it when choosing which tree to load.

## 2. Ladder (roles)

| Tree | Role | Coverage (approx., 2026-07-14) | May be used as |
|------|------|--------------------------------|----------------|
| **v1** | **LTS Wire Authority** | ~37 providers (highest production density) | **Production default wire** until v2 coverage is declared at parity |
| **v2** | **Evolution Authority** | ~12 providers | New schema features, compliance expansion, opt-in product paths |
| **v2-alpha** | **Time-boxed sandbox** | ~3 providers (may diverge from v2) | Experiments only; must graduate into `v2` or be archived |

### 2.1 Meaning of `dist/index.json` fields

| Field | Meaning |
|-------|---------|
| `versions` | Trees present in this package build |
| `latest` | **Evolution tip pointer** (currently `v2`) -- **not** "recommended production wire" |
| `authority.lts_wire` | Tree products/runtimes should default to for broad provider coverage |
| `authority.evolution` | Tree carrying forward schema / contract evolution |
| `authority.sandbox` | Experimental tree |
| `authority.production_default` | Same as `lts_wire` until an explicit parity announcement |
| `authority.latest_means` | Human-readable reminder: `latest` != production default |

**Do not** flip `latest` back to `v1` without a separate Maintainer decision + changelog. Fix the **semantics**, not the string, first (F7).

## 3. Runtime consume rules (GOV-006)

1. **Default load path**: prefer **`authority.production_default` / `lts_wire` (`v1`)** for multi-provider production agents unless the product **explicitly** opts into `v2` for a known provider subset.
2. **Pinning**: CI/release builds must pin npm package version **and** document which tree(s) they load (PROTO-PIN discipline). Changing tree without a pin note is a process defect.
3. **Following `latest`**: allowed only for evolution / early-adopter tracks that accept reduced provider coverage.
4. **`v2-alpha`**: never a silent fallback; require explicit opt-in.
5. **Stable consume fields**: expanding fields that hosts treat as stable still requires Protocol Proposal + review (GOV-006). This ladder does not grant blanket field freezes.

## 4. Application rules (ARCH-005)

- Eos / VelaClaw / Prism / Gateway may filter or overlay **locally**.
- Do **not** write product defaults, deployment provenance, or route Tag inventories into public provider YAML.
- Route **CapabilityTag** vocabulary lives in plans `capability-mapping.md` until mapped via PT-ARCH-002 schema; do not invent a second Tag enum in app code.

## 5. Graduation / retirement

| Event | Required action |
|-------|-----------------|
| Promote alpha feature | Land in `v2` (+ schema/compliance); remove or archive alpha fork |
| Declare v2 production-ready for a class of providers | Written parity note (provider count / required ops) + update `authority.production_default` only with Maintainer ACK |
| Retire a tree | Deprecation banner in this doc + CHANGELOG; keep read-only for pin window |

## 6. Non-goals

- Mass-migrating all v1 providers into v2 in this task
- Four-runtime "Envelope/Tag upgrade" epic
- Changing CR-L3 coding freeze (see plans Cadence)

## 7. Related

- [`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md) -- public vs application overlay
- [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) -- Capability / Execution / Policy Spec (PT-ARCH-004)
- [`PROVIDER_IDENTITY.md`](./PROVIDER_IDENTITY.md) -- canonical `gemini` + alias `google` (PT-ARCH-005 Option A)
- Architecture Audit / Cadence (private plans) -- F1/F7; A-E sequencing
- PT-ARCH-002 -- ProviderCapability <-> CapabilityTag mapping
- PT-ARCH-003 -- Context Envelope protocol catch-up
