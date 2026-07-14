# Capability vocabulary bridge (Experimental)

> **PT-ARCH-002** · Audit **F2** · Schema: [`schemas/v2/capability-tag-mapping.json`](../schemas/v2/capability-tag-mapping.json)  
> **Fixture**: [`v2/capability-tag-mapping.fixture.json`](../v2/capability-tag-mapping.fixture.json)

## Normative naming

| Term | Meaning | Source |
|------|---------|--------|
| **ProviderCapability** | Wire / feature: can this provider line do X? | `schemas/v2/capabilities.json` enum |
| **CapabilityTag** | Route / intent: what quality/intent does this request need? | plans `capability-mapping.md` |

**Do not** use bare “capability” in cross-repo contracts without the qualifier.

## Status

`experimental` until Protocol Proposal promotion. Hosts may read the fixture for alignment tests; must not treat mappings as frozen product policy.

## Related

- PT-ARCH-001 [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md)  
- PT-ARCH-003 [`CONTEXT_ENVELOPE.md`](./CONTEXT_ENVELOPE.md)  
- CR-CAP-001: inverted index is **not** a second Tag vocabulary and **not** Execution Runtime  
