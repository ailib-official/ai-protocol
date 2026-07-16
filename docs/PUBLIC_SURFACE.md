# Public Surface — What Counts as Protocol Authority (PT-ARCH-F10 / F10)

> **Status**: Normative (repository layout)  
> **Closes**: Architecture Audit **F10** (仓面噪声)

## 1. Public authority tree

These paths are the **public wire-contract + compliance** surface consumers should treat as truth:

| Path | Role |
|------|------|
| `schemas/` | JSON Schema contracts |
| `v1/` | LTS wire manifests + models |
| `v2/` | Evolution tip manifests + architecture fixtures; includes `contracts/` (ProviderContract overlays) and `packs/` (route bundles — see [`PACK_CONTRACT_BOUNDARIES.md`](./PACK_CONTRACT_BOUNDARIES.md)) |
| `v2-alpha/` | Explicit sandbox |
| `dist/` | Published JSON package surface (`npm` `files`) |
| `docs/` | Normative / Experimental companions (VERSION_AUTHORITY, identity, layers, …) |
| `tests/compliance/` | Cross-runtime compliance cases |
| `scripts/` | Validation / build / gates (CI) |
| `examples/` | Illustrative configs |

npm publish set (`package.json` `files`): `dist`, `v1`, `v2`, `v2-alpha`, `schemas` only.

## 2. Explicitly non-authority

| Path | Role |
|------|------|
| `archive/` | Historical / research archaeology (this task) |
| `work/` | Local/internal planning (gitignored) |
| `reports/` | Generated CI gate outputs (gitignored; workflow artifacts) |
| Root `*.tgz` | Local `npm pack` leftovers (gitignored) |

## 3. Root README hygiene

Root should stay thin: vision, structure pointing at authority paths, quickstart links into `docs/`.
Historical root markdown (comparisons, old release notes, audit drafts) lives under `archive/historical/`.

## 4. Related

- [`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md) — public vs application overlay  
- [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md) — which tree to load  
- [`PACK_CONTRACT_BOUNDARIES.md`](./PACK_CONTRACT_BOUNDARIES.md) — Pack / ProviderContract vs provider.yaml (F12)  
- [`../archive/README.md`](../archive/README.md) — archive disclaimer  
