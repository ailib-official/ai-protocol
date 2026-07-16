# Error Contract Names (PT-ARCH-007 / F9 / G5)

> **Status**: Normative (additive)  
> **Compat**: Coexists with E1001–E9999 — does **not** replace them  
> **Machine source**: [`v2/error-contract-names.fixture.json`](../v2/error-contract-names.fixture.json)  
> **Schema**: [`schemas/v2/error-contract-names.json`](../schemas/v2/error-contract-names.json)

## 1. Why a second naming layer?

Runtimes already normalize provider errors to **E codes** (`invalid_request`, `rate_limited`, …).
Cross-language **contract** surfaces (Facade / host Policy / capability routing) need stable
**semantic names** that answer *why the call failed in product terms*, not only HTTP class.

Per Maintainer Action Report **G5**, prefer:

`CapabilityUnavailable` · `PolicyRejected` · `ProtocolViolation` · `ProviderFailure`

Avoid exporting module-local type names (e.g. `PipelineError`) as the public contract.

## 2. Layering

| Layer | Examples | Owner |
|-------|----------|--------|
| **Contract name** | `CapabilityUnavailable` | Cross-language Facade / host APIs |
| **E code + snake name** | `E1005` / `request_too_large` | Wire normalization (`schemas/v2/error-codes.yaml`) |
| **Provider raw** | vendor status / body | Provider manifests `error_classification` |

Runtimes MUST keep mapping providers → E codes. Facades MAY expose contract names by mapping
from E codes (and/or local Policy decisions) using this document’s table.

## 3. Contract names

| Contract name | Meaning | Typical E-code targets |
|---------------|---------|-------------------------|
| **CapabilityUnavailable** | Requested capability/model/path is not available under declared protocol facts | `E1005` (incl. undeclared capability aliases), `E1004` |
| **PolicyRejected** | Host or provider **policy** denied the action (allowlist, spend, approval, account policy) | `E1003` |
| **ProtocolViolation** | Request/response violates the protocol contract (shape, required fields, unsupported combo) | `E1001` |
| **ProviderFailure** | Well-formed request failed on the provider / transport side | `E2001`, `E2002`, `E3001`, `E3002`, `E3003`, `E9999` |

Notes:

- **PolicyRejected** covers host Policy Spec (PT-ARCH-004) *and* provider-side permission/policy denials that already classify as `permission_denied`.
- **CapabilityUnavailable** must not be used for transient overload — use **ProviderFailure** (`E3002`).
- Multiple E codes may map to one contract name; Facades pick the most specific name for the call site.

## 4. Non-goals

- Renaming or deleting existing E codes
- Forcing all four runtimes to change public error enums in this PR
- Encoding host Policy inventories into public provider YAML
- Promoting Experimental Envelope/Tag schemas

## 5. Validation

`npm run validate:arch` loads the fixture against the schema and checks every mapped E code
exists in `schemas/v2/error-codes.yaml`.

## 6. Related

- [`schemas/v2/error-codes.yaml`](../schemas/v2/error-codes.yaml) — E-code SSOT  
- [`schemas/v2/errors.json`](../schemas/v2/errors.json) — JSON Schema for E codes  
- [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md) — Policy Spec vs Execution Spec  
- Architecture Audit **F9** / Maintainer Report **G5**
