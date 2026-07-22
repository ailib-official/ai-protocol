# Vocabulary freeze draft (G1) — PT-VOCAB-001

> **Status**: Maintainer-reviewable **draft** (not a stable API expansion)  
> **Task**: PT-VOCAB-001 · Pick D of NEXT-PICKS-GLOBAL-2026-07-22  
> **Date**: 2026-07-22  
> **Cadence**: Prerequisite for GOV-006 stable Facade and PT-ARCH-012 Catalog meat — **does not** thaw Catalog / Facade / public inverted index

## 1. Purpose

Freeze ownership boundaries between **protocol / wire vocabulary** and **product routing Tag / Hint vocabulary** so Facade and Catalog work cannot invent a second lexicon.

This draft consolidates existing artifacts; it does **not** replace them.

## 2. Ownership map (Normative)

| Lexicon | Owner document / schema | Who may extend | Status today |
|---------|-------------------------|----------------|--------------|
| **ProviderCapability** (wire / feature) | [`schemas/v2/capabilities.json`](../schemas/v2/capabilities.json) | Protocol Proposal | Normative enum in schema |
| **CapabilityTag** (route / intent) | plans [`capability-mapping.md`](https://github.com/hiddenpath/ai-lib-plans/blob/main/docs/architecture/capability-mapping.md) | Plans CR + mapping bump | Active v0.1.x |
| **Tag ↔ wire bridge** | [`schemas/v2/capability-tag-mapping.json`](../schemas/v2/capability-tag-mapping.json) + [`CAPABILITY_VOCABULARY_BRIDGE.md`](./CAPABILITY_VOCABULARY_BRIDGE.md) | Protocol Proposal | **Experimental** |
| **Tag freeze snapshot** | [`v2/architecture/capability-tag-freeze.snapshot.json`](../v2/architecture/capability-tag-freeze.snapshot.json) | Update with fixture + cite F-ID | Pilot (PT-ARCH-008) |
| **Context Envelope layers / strategy** | [`schemas/v2/context-envelope.json`](../schemas/v2/context-envelope.json) + [`CONTEXT_ENVELOPE.md`](./CONTEXT_ENVELOPE.md) | Protocol Proposal | **Experimental** |
| **Capability Catalog entries** | [`schemas/v2/capability-catalog.json`](../schemas/v2/capability-catalog.json) + [`CAPABILITY_CATALOG.md`](./CAPABILITY_CATALOG.md) | Phase 2 Proposal | Skeleton only — **no meat** in this draft |

## 3. Non-overlap rules (fail closed)

1. **Do not** use bare “capability” in cross-repo contracts — always qualify **ProviderCapability** vs **CapabilityTag**.
2. **Do not** add route Tags inside provider YAML / Catalog meat without updating `capability-mapping.md` first.
3. **Do not** treat Experimental Tag mapping or Envelope as silent stable Facade fields (GOV-006 required for promotion).
4. **Do not** invent a second Tag namespace for documents / L4 / Catalog — reuse §1 Tags or open a plans Proposal.
5. **Public manifest inverted index** remains permanently out of scope as a vocabulary owner.

## 4. Frozen Tag set (G1 pointer)

Authoritative freeze for architecture tests:

- Snapshot: `v2/architecture/capability-tag-freeze.snapshot.json`
- Must match `capability_tag` values in `v2/capability-tag-mapping.fixture.json`
- Current set: `coding`, `document_understanding`, `high-reasoning`, `long_context`, `speed`, `tool_calling`

Intentional changes require fixture + snapshot update and F-ID / Proposal citation (see [`ARCHITECTURE_TESTS.md`](./ARCHITECTURE_TESTS.md)).

## 5. Facade / Catalog prerequisites (what this draft unlocks)

| Downstream | Needs from this draft |
|------------|------------------------|
| **GOV-FACADE-001** | Stable field promotion cites §2 ownership; Experimental shapes remain experimental until Proposal |
| **PT-ARCH-012 Catalog meat** | Catalog entries reference ProviderCapability / documented Tags — not a third lexicon |
| **ALT-EXP-001 / ≥2-runtime nail** | Runtimes validate Envelope + Tag mapping without diverging Layer/Tag enums |

## 6. Explicit non-goals

- Promoting Envelope or Tag mapping to `status: stable`
- Catalog meat coding / public inverted index
- Four-runtime Envelope feature wave
- Expanding the Tag set in this PR (freeze-only)

## 7. Related

- PT-ARCH-002 [`CAPABILITY_VOCABULARY_BRIDGE.md`](./CAPABILITY_VOCABULARY_BRIDGE.md)
- PT-ARCH-003 [`CONTEXT_ENVELOPE.md`](./CONTEXT_ENVELOPE.md)
- PT-ARCH-008 [`ARCHITECTURE_TESTS.md`](./ARCHITECTURE_TESTS.md)
- plans `docs/architecture/capability-mapping.md`
- plans `docs/architecture/NEXT-PICKS-GLOBAL-2026-07-22.md` § D
