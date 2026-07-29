# AI-Protocol

**Provider-agnostic specification** for AI provider manifests and model registries — the **data-state rulebook** consumed by language runtimes (npm package **`@ailib-official/ai-protocol`**, package version **1.0.0**).

[中文文档](README_CN.md)

AI-Protocol standardizes how runtimes talk to providers across modalities (text, vision, audio, video). It complements [MCP](https://modelcontextprotocol.io): MCP focuses on tools and context at a high level; this repo focuses on **declarative API normalization** (endpoints, streaming maps, errors, capabilities) so runtimes can load the same manifests.

> **Pin vs tip:** Published npm is **`1.0.0`** (tag `v1.0.0`). Git `main` may include Unreleased architecture and metadata work (identity map, ME-001 model capabilities, provider admission waves). Pin the package/tag you intend; see [CHANGELOG](CHANGELOG.md) `Unreleased`.

## How it fits

| Layer | Role |
|-------|------|
| **This repo** | Schemas, YAML/JSON manifests, compliance fixtures, build → `dist/` |
| **Runtimes** | Load manifests, execute HTTP/SSE, normalize events ([ai-lib-rust](https://github.com/ailib-official/ai-lib-rust), [ai-lib-python](https://github.com/ailib-official/ai-lib-python), [ai-lib-ts](https://github.com/ailib-official/ai-lib-ts), [ai-lib-go](https://github.com/ailib-official/ai-lib-go)) |
| **Mock** | [ai-protocol-mock](https://github.com/ailib-official/ai-protocol-mock) for fixture-driven tests without live keys |

**Public authority** (what runtimes / GOV-006 consume): `schemas/`, `v1/`, `v2/`, `v2-alpha/`, `dist/`, `docs/`, `tests/compliance/`.  
See [`docs/PUBLIC_SURFACE.md`](docs/PUBLIC_SURFACE.md). Historical material under [`archive/`](archive/README.md) is **not** wire contract.

## Install

```bash
npm install @ailib-official/ai-protocol@1.0.0
```

Package `files`: `dist`, `v1`, `v2`, `v2-alpha`, `schemas`. Entry: `dist/index.json`.

Prefer **`dist/` JSON** in production. Resolve aliases via `dist/provider-identity.json` (see below).

### Schema `$schema` URLs

Pin a release for stability, or follow `main` for tip:

- Release: `https://raw.githubusercontent.com/ailib-official/ai-protocol/v1.0.0/schemas/v1.json`
- Tip: `https://raw.githubusercontent.com/ailib-official/ai-protocol/main/schemas/v1.json`

For v2 shapes use `schemas/v2/*.json` under the same tag/`main` rules.

## Version authority

Three concurrent trees. **`latest` ≠ production default.**

| Tree | Role | Approx. coverage (main tip) |
|------|------|-----------------------------|
| **v1** | **LTS wire / `production_default`** | ~37 providers + `v1/models/` registry |
| **v2** | **Evolution tip** (`dist/index.json` `latest`) | ~21 providers; contracts, packs, ME-001 metadata |
| **v2-alpha** | Explicit sandbox | anthropic, gemini, openai |

From `dist/index.json`:

```json
"latest": "v2",
"authority": {
  "lts_wire": "v1",
  "evolution": "v2",
  "sandbox": "v2-alpha",
  "production_default": "v1",
  "latest_means": "evolution_tip_not_production_default"
}
```

Normative detail: [`docs/VERSION_AUTHORITY.md`](docs/VERSION_AUTHORITY.md).

## Provider identity

Canonical ids + aliases are published for package consumers:

- **Map:** `dist/provider-identity.json`
- **Pointer:** `dist/index.json` → `identity.map`
- **Doc:** [`docs/PROVIDER_IDENTITY.md`](docs/PROVIDER_IDENTITY.md)

Examples (not exhaustive): `google` → `gemini`, `kimi` → `moonshot`, `glm` → `zhipu`, `ernie` / `qianfan` → `baidu`.

Lookup order: exact `id` → manifest `aliases` → published map → fail closed.

## Repository layout

```
ai-protocol/
├── schemas/                 # JSON Schema (v1.json, spec.json, schemas/v2/*)
├── v1/                      # LTS wire: providers/ + models/
├── v2/                      # Evolution: providers/, contracts/, packs/, architecture fixtures
├── v2-alpha/                # Sandbox overlays
├── dist/                    # Built JSON + index.json + provider-identity.json
├── docs/                    # Normative / Experimental companions
├── tests/compliance/        # Cross-runtime compliance cases
├── examples/
├── scripts/                 # validate / build / gates / ME helpers
└── archive/                 # Non-authority history
```

Key docs: [`PUBLIC_SURFACE`](docs/PUBLIC_SURFACE.md) · [`VERSION_AUTHORITY`](docs/VERSION_AUTHORITY.md) · [`PROVIDER_IDENTITY`](docs/PROVIDER_IDENTITY.md) · [`MANIFEST_LOGICAL_LAYERS`](docs/MANIFEST_LOGICAL_LAYERS.md) · [`MANIFEST_AUTHORITY`](docs/MANIFEST_AUTHORITY.md) · [`MODEL_CAPABILITY_METADATA`](docs/MODEL_CAPABILITY_METADATA.md) · [`SPEC`](docs/SPEC.md) · [`GETTING_STARTED`](docs/GETTING_STARTED.md)

## Core concepts

- **Operators** — parameter maps, streaming event maps, capability declarations, error classification / rate-limit headers. Public `retry_policy` is **Execution Spec defaults**, not host Policy ([`MANIFEST_LOGICAL_LAYERS`](docs/MANIFEST_LOGICAL_LAYERS.md)).
- **Version isolation** — validate each tree against its schemas; do not silently fall back from v1 → v2-alpha.
- **Modular manifests** — one provider file per id; PR-friendly.

### Model capability metadata (Experimental, PT-ME-001)

On **v2** `ai_provider` manifests, per-model facts live under `metadata.models.<id>`:

- Optional `model_capabilities` / `modalities` (and related fields) in [`schemas/v2/metadata-model-entry.json`](schemas/v2/metadata-model-entry.json)
- **Omit = unknown** (never serialize unknown as `false`)
- Prefer model facts over provider-level `capabilities.required` / `optional` ads when present

Docs: [`docs/MODEL_CAPABILITY_METADATA.md`](docs/MODEL_CAPABILITY_METADATA.md). Baseline gate: `npm run validate:arch`.

## Quick examples

### Provider (v1 excerpt)

```yaml
# v1/providers/anthropic.yaml
$schema: "https://raw.githubusercontent.com/ailib-official/ai-protocol/v1.0.0/schemas/v1.json"

id: anthropic
protocol_version: "1.5"

streaming:
  decoder:
    format: "anthropic_sse"
    strategy: "anthropic_event_stream"
```

### Errors / rate limits (excerpt)

```yaml
error_classification:
  by_http_status:
    "401": "authentication"
    "429": "rate_limited"
    "500": "server_error"

rate_limit_headers:
  requests_limit: "x-ratelimit-limit-requests"
  requests_remaining: "x-ratelimit-remaining-requests"

retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  retry_on_http_status: [429, 500]
```

### Model registry (v1)

```yaml
# v1/models/… — models keyed under models:
models:
  claude-3-5-sonnet:
    provider: anthropic
    model_id: "claude-3-5-sonnet-20241022"
    context_window: 200000
    capabilities: [chat, vision, tools, streaming]
```

Runtimes load `dist/` (or YAML sources) and resolve `provider/model` strings per their loader docs.

## Providers (main tip)

**v1 (~37):** ai21, anthropic, anyscale, azure, baichuan, baidu, cerebras, cohere, deepinfra, deepseek, doubao, fireworks, gemini, groq, huggingface, hunyuan, jina, lepton, minimax, mistral, moonshot, nvidia, openai, openrouter, perplexity, qwen, replicate, sensenova, siliconflow, spark, stability, tiangong, together, writer, xai, yi, zhipu.

**v2 (~21, evolution):** anthropic, baichuan, baidu, cerebras, cohere, deepseek, doubao, gemini, groq, hunyuan, jina, minimax, mistral, moonshot, nvidia, openai, perplexity, qwen, xai, yi, zhipu — including PT-ADM admission waves (xai/mistral/minimax; perplexity/yi/baichuan; hunyuan/baidu/cerebras) with ME-001 `metadata.models` enrichment on main.

**v2-alpha:** anthropic, gemini, openai.

Exact file lists: `v1/providers/`, `v2/providers/`, `v2-alpha/providers/`.

## Validate, build, gates

```bash
npm install
npm run validate              # AJV 2020-12 over providers/models/examples/schemas/specs
npm run validate:providers
npm run validate:models
npm run validate:schemas
npm run validate:compliance
npm run validate:arch         # architecture fixtures + ME-001 / identity gates
npm run build                 # YAML → dist/; writes index.json + provider-identity.json

npm run drift:check
npm run gate:manifest-authority
npm run gate:manifest-consumption
npm run gate:compliance-matrix
npm run gate:fullchain
npm run release:gate
```

Optional: `fact-check:models`, `me001:oneshot-candidate` (advisory; see [`docs/ME001_ONESHOT_CANDIDATE.md`](docs/ME001_ONESHOT_CANDIDATE.md)).

CI: `.github/workflows/validate.yml` (validate + build); `governance-report.yml` (report-only gates). Details: [`docs/CI_VALIDATION_EXPLAINED.md`](docs/CI_VALIDATION_EXPLAINED.md).

Wave-3 gate policy (report-only on PR review vs required fullchain on `main`): see historical notes in CHANGELOG / governance docs — default production wire remains **v1** until an explicit parity announcement.

## Contributing

1. Add `v1/providers/<id>.yaml` (and/or graduate into `v2/`) per schema
2. Register models under `v1/models/` when using the v1 registry
3. Prefer research notes under `research/providers/` with VERIFIED evidence
4. Run `npm run validate` (and `validate:arch` when touching v2 metadata / identity)
5. Open a PR

Guide: [`docs/CONTRIBUTING_PROVIDER.md`](docs/CONTRIBUTING_PROVIDER.md).

## Related runtimes

| Runtime | Repo |
|---------|------|
| Rust | [ailib-official/ai-lib-rust](https://github.com/ailib-official/ai-lib-rust) |
| Python | [ailib-official/ai-lib-python](https://github.com/ailib-official/ai-lib-python) |
| TypeScript | [ailib-official/ai-lib-ts](https://github.com/ailib-official/ai-lib-ts) |
| Go | [ailib-official/ai-lib-go](https://github.com/ailib-official/ai-lib-go) |
| Mock server | [ailib-official/ai-protocol-mock](https://github.com/ailib-official/ai-protocol-mock) |

Runtime package versions move independently — check each repo’s README / crates.io / PyPI / npm.

## License

Dual-licensed under [Apache-2.0](LICENSE-APACHE) or [MIT](LICENSE-MIT), at your option.

Unless you state otherwise, contributions are dual-licensed as above without additional terms.
