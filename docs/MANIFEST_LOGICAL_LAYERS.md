# Manifest Logical Layers (Normative)

> **Status**: Normative (PT-ARCH-004)  
> **Date**: 2026-07-15  
> **Closes**: Architecture Audit **F4** (Manifest Fatigue)  
> **Does not**: force a physical multi-repo or multi-file split of provider YAML in this task

## 1. Purpose

A single `v2/providers/*.yaml` file today stacks endpoint / streaming / errors, capabilities,
`retry_policy`, metadata, and contracts. That **physical** packing is fine for packaging, but
without an explicit **logical** model it drifts into a fat DSL (Maintainer C3 / Audit F4).

This document defines three **logical specs**. Fields may still live in one YAML file; authors
and reviewers must place each field in exactly one logical home and refuse Policy/product
provenance in the public tree ([`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md)).

## 2. Three logical layers

| Layer | Name | Question it answers | Typical field families |
|-------|------|---------------------|------------------------|
| **L-Cap** | **Capability Spec** | What can this provider/model do? | `capabilities` (ads + L-Exec-adjacent nests), `feature_flags`, `capability_profile`, `multimodal`, `tool_calling`, `computer_use`, `mcp`, capacity + **Experimental** `metadata.models.*.model_capabilities` / `modalities` ([`MODEL_CAPABILITY_METADATA.md`](./MODEL_CAPABILITY_METADATA.md)) |
| **L-Exec** | **Execution Spec** | How do runtimes talk to the wire? | `endpoint` / `endpoints`, `streaming`, `error_classification`, `rate_limit_headers`, `termination`, `parameters`, `api_families`, `provider_contract`, **`retry_policy` (see §3)** |
| **L-Pol** | **Policy Spec** | What may *this host* allow or override? | **Not** in public provider YAML. Lives in application overlay / host config (approval, allowlists, spend caps, region product defaults, route Tag inventories) |

Keep all three **declarative**. Do not encode host orchestration, approval workflows, or
product defaults into public manifests.

```
┌─────────────────────────────────────────────────────────┐
│  Physical package: v2/providers/<id>.yaml (optional pack)│
│                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│   │ Capability  │  │ Execution   │  │ Policy (absent) │ │
│   │ Spec L-Cap  │  │ Spec L-Exec │  │ → app overlay   │ │
│   └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 3. `retry_policy` ownership (clarification)

| Claim | Rule |
|-------|------|
| **Public manifest `retry_policy`** | **Execution Spec** — vendor-observed / wire-friendly **defaults** (status codes, backoff bounds) that runtimes may use as a baseline |
| **Host Policy** | Application overlay may **tighten, loosen, or disable** retries; never write host-only policy back into public YAML |
| **Not Policy Spec in-protocol** | Public `retry_policy` is **not** approval, allowlist, or spend policy |

Runtimes SHOULD treat manifest `retry_policy` as **hints with fail-closed overrides** from host
config. Silent hard-coding of product retry matrices into provider YAML is a F4 regression.

Related wire resilience fields (`error_classification`, `rate_limit_headers`) are also **L-Exec**.

## 4. What belongs in provider YAML vs policy overlay

### 4.1 Allowed in public provider YAML

| Layer | Examples |
|-------|----------|
| L-Cap | Declared ops (`chat`, `tools`, …), modality flags, model `context_window` / `max_output_tokens`, Experimental per-model `model_capabilities` / `modalities` (omit = unknown; prefer over provider `required`/`optional` ads when present) |
| L-Exec | Base URL, auth scheme shape, streaming decoder hints, HTTP→error map, **retry defaults**, termination map |
| Shared hygiene | Stable `id`, `protocol_version`, `official_url`, allowed `verification.source` values |

### 4.2 Must stay in application overlay (Policy Spec)

| Forbidden in public YAML | Home instead |
|--------------------------|--------------|
| Product default model lists / “Eos default” | App config / overlay |
| Approval gates, tool allowlists, spend caps | Host Policy |
| Route **CapabilityTag** inventories as product truth | plans mapping + Experimental bridge; local filter |
| Deployment smoke notes, PR/SHA provenance | Private plans / ops notes ([`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md)) |
| Capability inverted index / candidate rankings | Host helper only (ARCH-005 / CR-CAP-001 No-go for public write-back) |

## 5. Schema / packaging guidance (no forced split)

1. **Logical first**: new fields must declare L-Cap / L-Exec in the PR description; L-Pol fields are rejected from public trees.
2. **Physical optional**: schema `$ref` partitions or packs (`v2/contracts`, capability packs) are allowed when they reduce fatigue — **not required** to close F4. Coexistence rules are Normative in [`PACK_CONTRACT_BOUNDARIES.md`](./PACK_CONTRACT_BOUNDARIES.md) (PT-ARCH-010 / F12). Capability identities: [`CAPABILITY_CATALOG.md`](./CAPABILITY_CATALOG.md) (PT-ARCH-011 / F8).
3. **Ring model**: existing Ring 1–3 language in `provider.json` remains packaging taxonomy; map Rings onto L-Cap / L-Exec without inventing a fourth product layer.
4. **Experimental surfaces**: CapabilityTag mapping / Context Envelope stay Experimental ([`CAPABILITY_VOCABULARY_BRIDGE.md`](./CAPABILITY_VOCABULARY_BRIDGE.md), [`CONTEXT_ENVELOPE.md`](./CONTEXT_ENVELOPE.md)); do not smuggle host Policy into them.

## 6. Reviewer checklist (Architecture)

- [ ] Field is L-Cap or L-Exec (not host Policy)
- [ ] No product provenance / hiddenpath / deployment notes ([`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md))
- [ ] If touching `retry_policy`: documented as Execution defaults; host may override
- [ ] No new stable consume field without Protocol Proposal (GOV-006)
- [ ] No Capability index write-back to public manifest (ARCH-005)

## 7. Non-goals

- Splitting every provider into three files/repos in this task
- Removing existing `retry_policy` blocks from v2 YAML
- Four-runtime Policy unification
- Promoting Experimental Envelope/Tag schemas to stable Facade

## 8. Related

- [`MANIFEST_AUTHORITY.md`](./MANIFEST_AUTHORITY.md) — public vs overlay  
- [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md) — which tree to load (PT-ARCH-001)  
- Maintainer Action Report v2 — **C3** Manifest logical layering  
- Architecture Audit — **F4** Manifest Fatigue  
