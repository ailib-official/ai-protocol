# Capability Catalog (PT-ARCH-011 / F8 / C2)

> **Status**: Normative **skeleton** (`normative_skeleton`)  
> **Machine source**: [`v2/capability-catalog.fixture.json`](../v2/capability-catalog.fixture.json)  
> **Schema**: [`schemas/v2/capability-catalog.json`](../schemas/v2/capability-catalog.json)  
> **Closes**: Architecture Audit **F8** (Capability Catalog 未成形) — first slice only

## 1. What this is

Maintainer Action Report **C2** asks the registry to grow into a first-class directory:

`Capability · Schema · Version · Compatibility · Metadata · Provider Mapping`

This document + fixture are that **directory skeleton** for wire **ProviderCapability** ids
(from [`schemas/v2/capabilities.json`](../schemas/v2/capabilities.json) `#/$defs/capability_name`).

It does **not** replace provider YAML, CapabilityTag routing, Packs, or host inverted indexes.

## 2. Layering (keep the qualifiers)

| Layer | Role | Authority |
|-------|------|-----------|
| **Capability Catalog** (this) | First-class Capability *directory* | `capability-catalog` fixture + schema |
| **ProviderCapability** | Wire feature flags on manifests | `capabilities.json` + provider YAML |
| **CapabilityTag** | Route / intent vocabulary | Experimental [`CAPABILITY_VOCABULARY_BRIDGE.md`](./CAPABILITY_VOCABULARY_BRIDGE.md) |
| **Host inverted index** | Tag → candidate providers | **Host helper only** (CR-CAP-001 No-go in protocol) |
| **Pack** | Curated provider/model routes | [`PACK_CONTRACT_BOUNDARIES.md`](./PACK_CONTRACT_BOUNDARIES.md) |

**Do not** use bare “capability” in cross-repo contracts without the qualifier.

## 3. Skeleton rules (Normative)

1. **Coverage**: Catalog `entries[].id` for `kind: provider_capability` MUST be exactly the
   `capability_name` enum in `capabilities.json` (no silent subset, no extras).
2. **C2 fields required** on every entry: `schema_ref`, `version`, `compatibility`,
   `metadata.description`, `provider_mapping.declaration_path`.
3. **Manifests remain declaration authority** for whether a given provider supports a Capability;
   Catalog describes the Capability *identity*, not a live inventory of providers.
4. **CapabilityTag is not a Catalog primary row** in this skeleton. Tags stay Experimental via
   the Tag↔wire bridge until a separate Protocol Proposal promotes Tag rows (or a new `kind`).
5. **Not an inverted index.** Publishing Tag→candidates (or product defaults) into this Catalog
   or into public provider YAML is forbidden (Cadence Freeze / ARCH-005 / CR-CAP-001).

## 4. Growing meat later (explicitly out of this PR)

Future Catalog “meat” (still requires GOV-006 / Protocol Proposal as appropriate):

- Per-Capability richer schemas beyond the shared `capabilities.json` declaration shape
- Compatibility matrices across protocol versions with deprecation windows
- Optional `kind` expansion (e.g. promoted Tags) — not silent enum growth
- Graph / Lifecycle documentation links (Maintainer **C4**) without turning Catalog into an engine

## 5. Validation

`npm run validate:arch` loads the fixture against the schema and asserts enum coverage parity
with `schemas/v2/capabilities.json`.

## 6. Related

- [`CAPABILITY_VOCABULARY_BRIDGE.md`](./CAPABILITY_VOCABULARY_BRIDGE.md) — ProviderCapability ↔ CapabilityTag  
- [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) — L-Cap / L-Exec / L-Pol  
- [`PACK_CONTRACT_BOUNDARIES.md`](./PACK_CONTRACT_BOUNDARIES.md) — packs are not Catalog  
- [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md) — which tree to load  
- Maintainer v2 **C2** / Audit **F8**
