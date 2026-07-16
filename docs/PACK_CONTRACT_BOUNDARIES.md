# Pack / ProviderContract Boundaries (PT-ARCH-010 / F12)

> **Status**: Normative (coexistence rules)  
> **Closes**: Architecture Audit **F12** (Pack/Contract 边界未 Normative)  
> **Does not**: invent Capability Catalog (F8); open pack marketplace; rewrite wire manifests

## 1. Three physical artifacts — one authority story

| Artifact | Path | Schema | Role |
|----------|------|--------|------|
| **Provider manifest** | `v1|v2|v2-alpha/providers/<id>.yaml` | `provider.json` / `v1.json` | **Primary wire authority** — endpoints, params, errors, capabilities declared on the provider |
| **ProviderContract** | `v2/contracts/*.contract.yaml` | [`provider-contract.json`](../schemas/v2/provider-contract.json) | **Execution overlay** — request/response mapping, content-block encoding, capability_contracts for a specific `api_style` |
| **Pack** | `v2/packs/**/*.json` | [`pack.json`](../schemas/v2/pack.json) | **Route bundle** — curated `provider`+`model` preferences for smart routing; does **not** redefine endpoints |

```
provider.yaml  ──(primary)──► runtimes / dist consumers
       ▲
       │  provider_id / provider must resolve (id or identity alias)
       │
contracts/ ── overlay mapping for drivers / encoders
packs/     ── optional route curated sets (draft→stable lifecycle)
```

## 2. Normative coexistence rules

1. **Manifests win for wire facts.** If a Pack or ProviderContract disagrees with the provider YAML on endpoint, auth, or declared capability presence, the **manifest** is authoritative. Contracts/packs MUST be updated to match, not the reverse by silent override.
2. **Contracts do not replace manifests.** A ProviderContract MAY refine *how* to encode/decode for an `api_style`; it MUST NOT be the sole registration of a provider. Every `provider_id` in `v2/contracts/` MUST resolve to a public provider primary id (or an identity **alias** of one) in `v1` or `v2`.
3. **Packs do not invent providers.** Every Pack `provider_routes[].provider` MUST resolve the same way. Packs MUST NOT embed full endpoint/capability copies of manifests.
4. **v1 tooling stays on manifests.** LTS production default remains `v1` wire ([`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md)). Packs are a **v2 extension**; v1 CI/tooling is not required to load `v2/packs/`.
5. **Identity aliases apply.** Prefer canonical ids (`gemini`, not `google`) in new contracts/packs; aliases remain resolvable via [`PROVIDER_IDENTITY.md`](./PROVIDER_IDENTITY.md) / `dist/provider-identity.json`.
6. **Not a Capability Catalog.** Packs and contracts are **not** F8’s first-class Schema·Version·Compatibility·Mapping catalog. Tag filtering on pack routes is advisory metadata, not the Tag vocabulary SSOT ([`CAPABILITY_VOCABULARY_BRIDGE.md`](./CAPABILITY_VOCABULARY_BRIDGE.md)).
7. **Not a host Policy surface.** Packs MUST NOT encode allowlists, spend caps, or product defaults that belong in host Policy Spec ([`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) §4.2).

## 3. Layer mapping (PT-ARCH-004)

| Logical layer | Typical home |
|---------------|--------------|
| **L-Cap** Capability Spec | Provider manifest capability declarations |
| **L-Exec** Execution Spec | Manifest endpoints + **ProviderContract** mapping overlays |
| **L-Pol** Policy Spec | Host / application only — never packs or public YAML |

## 4. Validation

| Check | Command |
|-------|---------|
| Schema shape for packs/contracts | `npm run validate` (includes `--packs` / `--contracts`) |
| Boundary resolve (provider_id / pack provider → registry) | `npm run validate:arch` (PT-ARCH-010 gates) |

## 5. Detail specs (unchanged ownership)

- Pack field reference: [`PACK_SPECIFICATION.md`](./PACK_SPECIFICATION.md) (schema detail; marketplace still out of scope)
- ProviderContract field reference: [`V2_ARCHITECTURE.md`](./V2_ARCHITECTURE.md) §10
- Content-block encoding driven by contracts: [`spec/content-block-encoding/document.md`](./spec/content-block-encoding/document.md)

## 6. Non-goals

- Pack marketplace / signed registry / runtime pack loader
- Moving all L-Exec fields out of provider YAML into contracts
- Promoting draft example packs to production SLA
- F8 Capability Catalog
- CR-L3-003/004 ACK / L4
