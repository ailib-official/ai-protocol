# Context Envelope protocol catch-up (Experimental)

> **PT-ARCH-003** · Audit **F3** · Schema: [`schemas/v2/context-envelope.json`](../schemas/v2/context-envelope.json)  
> **Fixture**: [`v2/context-envelope.fixture.json`](../v2/context-envelope.fixture.json)

## Why this exists

ADR-2026-07 and CR-L1 landed `MessageChunk` / `ContextLayer` / `assemble_layered` + `HardBudgetViolation` in **ai-lib-rust** and VelaClaw pilots **before** an equivalent protocol schema. That Runtime-first gap is F3 debt.

This schema is the **minimal Experimental** catch-up so:

1. Cross-language consumers have a pin-able contract shape.  
2. Cadence thaw for CR-L3 host slices can cite a protocol artifact.  
3. Further stable-field expansion still goes through Protocol Proposal (A1 / GOV-006).

## Alignment with ai-lib-rust (CR-L1)

| Protocol | Rust (`ai-lib-contact`) |
|----------|-------------------------|
| `chunks[].layer` system…archive | `ContextLayer` 0–5 |
| critical = system + active | `is_critical()` |
| `strategy` chat / code-fix | `AssembleStrategy` |
| `HardBudget` (doc) | `AssembleError::HardBudgetViolation` |
| `chunks[].content` string | `Message` text path (blocks TBD in later revision) |

**Archive** chunks must not be expanded into the model payload by default (Assembler rule).

## Status / consume rules

- Marked **`experimental`** — not a silent stable Facade.  
- Rust remains source of assembly algorithm truth; schema documents the envelope **shape**.  
- Other runtimes: do **not** invent divergent Layer enums; follow this schema or stay on sync host pilots only.

## Related

- [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md)  
- [`CAPABILITY_VOCABULARY_BRIDGE.md`](./CAPABILITY_VOCABULARY_BRIDGE.md)  
- Cadence thaw: CR-L3 coding still needs plans Cadence §5.E checklist  
