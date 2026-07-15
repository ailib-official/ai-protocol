# AI Protocol — Provider Manifest Specification

**Version:** 1.1  
**Status:** Living reference (not a frozen RFC)  
**Audience:** Runtime implementers, provider maintainers, toolchain authors  
**Last Updated:** 2026-07-15 (PT-ARCH-006 hygiene)

> **Authority:** Tree choice (v1 LTS vs v2 evolution) is normative in
> [`VERSION_AUTHORITY.md`](./VERSION_AUTHORITY.md). Logical manifest layers:
> [`MANIFEST_LOGICAL_LAYERS.md`](./MANIFEST_LOGICAL_LAYERS.md). Provider id aliases:
> [`PROVIDER_IDENTITY.md`](./PROVIDER_IDENTITY.md). Schema truth remains under
> `schemas/` + `npm run validate`.

---

## 1. Scope and Goals

This specification defines a **provider manifest format** for describing AI service providers in a **runtime-consumable, reloadable, and verifiable** manner.

The manifest is designed to be:

* **Provider-agnostic**
* **Runtime-first**
* **Schema-verifiable**
* **Hot-reload friendly**
* **Network-aware**

This specification intentionally separates **static structure validation** from **dynamic availability checks**, while providing sufficient metadata for both CI pipelines and production runtimes.

---

## 2. Design Principles

### 2.1 Runtime Determinism

A runtime MUST be able to determine, at any point in time:

* Whether a provider is eligible for use
* Whether a provider is currently reachable
* What capabilities a provider supports

Manifests that omit such information are considered **incomplete** and MUST be rejected.

---

### 2.2 Explicit Over Implicit

The specification does **not** allow implicit assumptions, including but not limited to:

* Region reachability
* Capability inference
* Availability fallback

All runtime-relevant behavior MUST be explicitly declared.

---

### 2.3 Fail Predictably

* Schema validation failures MUST be deterministic.
* Network-related failures MUST be isolated and configurable.
* A temporary outage MUST NOT invalidate a manifest's structural correctness.

---

## 3. Manifest Structure Overview

A provider manifest is a YAML document with the following **required top-level sections**:

```
id
endpoint
availability
capabilities
```

Additional metadata MAY be present.

---

## 4. Provider Identity

### 4.1 `id` (Required)

A globally unique identifier for the provider.

```yaml
id: anthropic
```

* MUST be lowercase
* MUST be stable across versions
* MUST NOT contain whitespace
* Pattern: `^[a-z0-9][a-z0-9-_]{1,63}$`

---

### 4.2 Optional Metadata

```yaml
name: Anthropic
version: "2024-12"
status: stable   # stable | beta | deprecated
category: ai_provider  # ai_provider | model_provider | third_party_aggregator
official_url: "https://docs.anthropic.com"
support_contact: "https://support.anthropic.com"
```

These fields are informational and MUST NOT affect runtime behavior.

---

## 5. Endpoint Definition

The `endpoint` section defines how the provider is reached at the network level.

```yaml
endpoint:
  base_url: https://api.example.com
  protocol: https
  timeout_ms: 10000
```

### 5.1 `base_url`

* MUST be a valid absolute URI
* MUST NOT include credentials
* MUST represent the logical API root

---

### 5.2 `protocol`

* Allowed values: `https`, `http`, `ws`, `wss`
* Default: `https`

---

### 5.3 `timeout_ms`

* Applies to runtime requests unless overridden
* SHOULD have a reasonable default (e.g. 10s)
* Minimum: 100ms

---

## 6. Availability and Health Checking

The `availability` section defines **when** and **how** a provider is considered usable.

```yaml
availability:
  required: true
  regions:
    - global
  check:
    method: HEAD
    path: /v1/models
    expected_status: [200, 401]
    timeout_ms: 3000
```

---

### 6.1 `required`

| Value   | Meaning                                        |
| ------- | ---------------------------------------------- |
| `true`  | Provider MUST be reachable for runtime startup |
| `false` | Provider MAY be skipped if unavailable         |

A runtime MUST fail fast if a required provider is unavailable.

---

### 6.2 Region Semantics

#### Allowed values

```
cn
global
us
eu
```

#### Normative definitions

* **`cn`**
  Reachable from mainland China without special routing.

* **`global`**
  Reachable from the general international Internet.
  **This does NOT imply reachability from mainland China.**

* **`us`**
  Explicitly deployed in US region only.

* **`eu`**
  Explicitly deployed in EU region only.

* **Multiple regions MAY be listed**, e.g.:

```yaml
regions:
  - cn
  - global
```

This explicitly declares dual availability.

**Runtimes MUST NOT assume implicit coverage.**

---

### 6.3 Health Check Definition

The `check` object defines how connectivity is verified.

* Checks SHOULD NOT require authentication
* Unauthorized responses (401) MAY be considered healthy if they indicate the service is reachable

#### Status interpretation

A provider is considered reachable if:

* TCP connection succeeds
* HTTP response status 鈭?`expected_status`

---

## 7. Capabilities Declaration

Capabilities define **what a provider can do**, not how it does it.

### 7.1 Capability Format

```yaml
capabilities:
  streaming: true
  tools: false
  vision: false
  agentic: false
  reasoning: false
  parallel_tools: false
```

### 7.2 Capability Contract

* Capabilities MUST be accurate
* Runtimes MUST NOT attempt unsupported features
* Capability mismatch MUST be treated as a configuration error

---

## 8. Runtime Behavior (Normative)

A compliant runtime implementation MUST:

1. Load all manifests
2. Validate against schema
3. Filter providers by `regions` (if available)
4. Perform availability checks (if `availability.check` is defined)
5. Register eligible providers
6. React to manifest reloads deterministically

A runtime MAY cache health check results but MUST respect TTL or retry policies.

---

## 9. CI and Validation Model

This specification assumes **multi-stage validation**:

| Stage               | Purpose                  |
| ------------------- | ------------------------ |
| Schema Validation   | Structural correctness   |
| Linting             | Human quality            |
| Connectivity Check  | Environmental validation |
| Runtime Enforcement | Final authority          |

CI pipelines SHOULD treat connectivity failures as warnings unless explicitly configured otherwise.

---

## 10. Versioning and Evolution

This specification follows semantic versioning:

* **Patch**: Clarifications
* **Minor**: New fields and capabilities
* **Major**: Behavioral changes

---

## 11. Version Semantics and Runtime Alignment

### 11.1 Layered Versioning Model

AI-Protocol uses a **layered versioning model** to enable independent evolution of different components:

| Version Field | Location | Format | Purpose |
|---------------|----------|--------|---------|
| `spec_version` | `v1/spec.yaml` | MAJOR.MINOR | Schema structure and field definitions |
| `protocol_version` | Provider manifests | MAJOR.MINOR | Protocol features used by the config |
| `release_version` | Metadata | MAJOR.MINOR.PATCH | Full release version |

### 11.2 Runtime Version Alignment

A compliant runtime MUST implement the following version handling:

1. **Schema Validation**
   - Load the schema corresponding to the manifest's `$schema` URL
   - Validate manifest structure before processing

2. **Protocol Version Check**
   - Read `protocol_version` from provider configs
   - Select appropriate adapters/handlers based on version
   - Reject configs with unsupported protocol versions

3. **Backward Compatibility**
   - Support multiple protocol versions when feasible
   - Provide clear migration paths for deprecated versions

### 11.3 Best Practices

#### For Manifest Authors

```yaml
# Pin to specific release for stability
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/v0.2.1/schemas/v1.json"
protocol_version: "1.5"
```

#### For Runtime Implementers

```text
load_manifest(path):
  1. Parse YAML
  2. Extract $schema URL → resolve schema version
  3. Validate against schema
  4. Check protocol_version is supported
  5. Initialize version-appropriate handlers
```

### 11.4 Version Independence

> **Key Principle**: Manifests MUST NOT depend on Git branch names.

- Use **version tags** or **explicit schema URLs** for version pinning
- Runtimes SHOULD resolve `default` references via API, not branch assumptions
- This enables:
  - Historical repository compatibility
  - Enterprise private repository support
  - Branch-agnostic CI/CD pipelines

---

## 12. Non-Goals

This specification explicitly does NOT define:

* API request/response payload formats
* Authentication secrets
* Billing or quota enforcement
* Business SLAs

These concerns belong to runtime or provider-specific layers.

---

## 13. Summary

This specification defines a **deterministic, runtime-first, industrial-grade** manifest format for AI providers.

A manifest conforming to this specification is:

* Safe to hot-reload
* Predictable under failure
* Suitable for production runtimes

---

### Status

This document is a **living reference**. Normative Architecture Workstream docs
(`VERSION_AUTHORITY`, `MANIFEST_*`, `PROVIDER_IDENTITY`, Experimental bridges)
supersede aged wording here when they conflict. Wire schemas under `schemas/`
remain the validation truth source.

---

## References

* [VERSION_AUTHORITY.md](./VERSION_AUTHORITY.md) — which tree to load (PT-ARCH-001)
* [MANIFEST_LOGICAL_LAYERS.md](./MANIFEST_LOGICAL_LAYERS.md) — Cap / Exec / Pol (PT-ARCH-004)
* [PROVIDER_IDENTITY.md](./PROVIDER_IDENTITY.md) — canonical ids + aliases (PT-ARCH-005)
* [V2_ARCHITECTURE.md](./V2_ARCHITECTURE.md) — V2 pyramid design
* [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema)
* [RFC 2119 - Key words for use in RFCs](https://tools.ietf.org/html/rfc2119)
