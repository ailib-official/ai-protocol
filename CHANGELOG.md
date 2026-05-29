# Changelog

All notable changes to AI-Protocol specifications and schemas will be documented here.

## Unreleased

### Added

- **EOS-ARCH-R2 availability (Phase 0–1)**: Optional `approval_ids` on `schemas/v2/availability.json`; first v2 `availability.regions` usage on DeepSeek (cn+global reference), OpenAI, Google; new v2 providers **NVIDIA NIM** and **Groq** with Eos-aligned model capacity metadata; compliance cases `load-v2-availability-eos.yaml` (load-012–014).

### Added (prior) `v1/models/gemini.yaml` now includes `gemini-2.5-flash-lite` and `gemini-3.1-flash-lite-preview` alongside 2.5 Flash/Pro; `v1/providers/gemini.yaml` documents `chat_completions` via `{base_url}/openai/chat/completions` (Authorization Bearer) for Google AI Studio keys.
- **Credential-chain compliance (PT-074)**: `tests/compliance/cases/09-credential-resolution/` covers BYOK credential precedence, manifest env handling, custom header/query-param auth attachment, redacted diagnostics, and WASM host-supplied credential boundaries.
- **Credential-chain single-source semantics (PT-074-B-FIX)**: `cred-009` and `cred-010` lock down "endpoint.auth is the single source of truth when both endpoint.auth and a divergent top-level auth are declared." Runtimes MUST scan only the winning endpoint.auth for env names, MUST NOT silently resolve shadowed legacy envs, and SHOULD surface a diagnostic identifying the shadowed block. Shared fixture `tests/compliance/fixtures/providers/mock-credential-dual-auth.yaml`.
- **Wave-5 v1 RC gate template**: `docs/WAVE5_V1_GATE_CHECKLIST.md` (PT-073 blocking checklist; sign-off in CI/release process).
- **E/P boundary (Wave-5 PT-067)**: `schemas/v2/execution-metadata.json`; `tests/compliance/ep-boundary/` (`E_ONLY_CASES.md`, `module-matrix.yaml`, `check_ep_boundary.py`); compliance README section.

### Changed

- **v2 provider validation**: Remove legacy top-level `parameter_mappings` from v2 YAML (not in `provider.json` schema); restores `validate:providers` green for all 12 v2 manifests.

### Changed (prior) `scripts/validate.js` accepts `https://raw.githubusercontent.com/ailib-official/ai-protocol/...` (replacing legacy `hiddenpath/ai-protocol`), matching published YAML. `schemas/v1.json` `$schema` pattern allows optional patch version tags (e.g. `v0.8.4`).
- **npm package name:** registry publishes as `@ailib-official/ai-protocol` (scoped); `package.json` `name` field aligned to match.
- **`check_ep_boundary.py` (Python)**: AST scan of `src/ai_lib_python/client/` forbids static imports of contact-layer subpackages (except under `if TYPE_CHECKING:`); aligns mixed `client` surface with Paper1 §3.2.
- **`docs/WAVE5_V1_GATE_CHECKLIST.md`**: documents PT-073 CI workflows in `ai-lib-rust`, `ai-lib-ts`, and `ai-lib-python` (Rust / TS / Python order).

## 0.8.1 (2026-03-08) - Compliance Matrix Activation and Fullchain Gates

### Added

- **Cross-repo compliance matrix gate**: `scripts/gate-compliance-matrix.js` with required/report-only modes and JSON reports.
- **Fullchain governance gate orchestration**: `scripts/gate-fullchain.js` chaining drift, manifest consumption, compliance matrix, and release gates.
- **Governance workflow integration**: `.github/workflows/governance-report.yml` now runs compliance/fullchain gates in report-only mode and archives artifacts.
- **Rollback drill input fixture**: `scripts/release-gate-input.rollback-drill.json` for repeatable blocked->report-only drill validation.

### Changed

- `drift-detect.js` and `release-gate.js` now support `--report-only` advisory mode for staged gate enforcement.
- README governance section now documents compliance/fullchain gate commands and report-first execution strategy.

## 0.8.0 (2026-03-07) - Generative Fullchain Upgrade

### Added

- **P0 generative provider compliance expansion**: Added V2 compliance fixtures for Google and DeepSeek and wired load cases for P0 provider onboarding gates.
- **Governance automation scripts**:
  - `scripts/drift-detect.js` for provider/fixture/case drift detection
  - `scripts/release-gate.js` for release readiness decisioning
  - `scripts/release-gate-input.example.json` as gate input template
- **NPM governance commands**:
  - `npm run drift:check`
  - `npm run release:gate`

### Changed

- **Multimodal V2 schema**: Extended `schemas/v2/multimodal.json` with `multimodal.output.video` contract for generation/declaration alignment.
- **Public docs**: README now includes governance gate workflow for drift checks and release gating.

## 0.7.6 (2026-02-20) - ZeroClaw Upstream Schema Extensions

### Added

- **`schemas/v2/availability.json`**: Optional `interval_ms` (suggested health check interval) and `fallback` (fallback check config)
- **`schemas/v2/error_classification`**: Optional `retry_after_extraction` (pattern + unit for extracting Retry-After from response body)
- **`schemas/v2/pricing.json`**: New schema for optional provider pricing (input/output per 1k tokens, currency)
- **`schemas/v2/provider.json`**: Optional `pricing` field referencing pricing.json
- **`docs/ECOSYSTEM_MATRIX.md`**: Feature flag matrix for ai-lib-rust and ai-lib-python

## 0.7.0 (2026-02-16) - V2 Phase 3 Complete: Full Runtime Implementation

This release marks the completion of **Phase 3** — full V2 runtime implementation across both Rust and Python runtimes. Includes MCP tool bridge, Computer Use abstraction with safety policy, extended multimodal validation, CLI tooling, and comprehensive integration tests.

### Added

#### Runtime Modules (Rust: ai-lib-rust)
- **`mcp/mod.rs`**: MCP tool bridge — McpToolBridge with namespace, allow/deny filters, provider config extraction
- **`computer_use/mod.rs`**: Computer Use abstraction — normalized ComputerAction, SafetyPolicy (domain allowlist, max actions, sensitive path protection)
- **`multimodal/mod.rs`**: Multimodal capabilities — format validation, modality detection, content validation
- **`bin/ai_protocol_cli.rs`**: CLI tool — validate, info, list, check-compat commands

#### Runtime Modules (Python: ai-lib-python)
- **`mcp/__init__.py`**: MCP tool bridge — McpToolBridge, McpProviderConfig
- **`computer_use/__init__.py`**: Computer Use abstraction — ComputerAction, SafetyPolicy, CuProviderConfig
- **`multimodal/__init__.py`**: Multimodal capabilities — MultimodalCapabilities, format validation

#### Integration Tests
- **`tests/v2_compliance.rs`**: 6 Rust integration tests — full chain OpenAI/Anthropic/Gemini + MCP roundtrip + CU safety + multimodal validation
- **`tests/integration/test_v2_compliance.py`**: 6 Python integration tests — matching Rust coverage

#### Documentation
- **`docs/V2_MIGRATION_GUIDE.md`**: V1→V2 migration guide with examples and CLI instructions

### Test Coverage
- **Rust**: 157 unit tests + 6 integration tests = 163 total (all pass)
- **Python**: 59 unit tests + 6 integration tests = 65 new V2 tests (all pass)
- **CLI**: 53/53 protocol files validated, 37 providers listed

---

## 0.6.0 (2026-02-16) - V2-Beta: MCP / Computer Use / Extended Multimodal

This release marks the **V2-Beta** milestone — the first public beta of the V2 protocol. It delivers three major new capability schemas (MCP, Computer Use, Extended Multimodal), the ProviderContract specification, 6 formal V2 provider manifests, and architectural finalization.

### Added

#### New V2 Schemas
- **`schemas/v2/provider-contract.json`**: Runtime provider contract — defines API style, request/response mapping, capability contracts, degradation strategies
- **`schemas/v2/context-policy.json`**: Context management policy — sliding window, summarization, token budgets, overflow handling

#### V2 Provider Manifests (Formal)
- **`v2/providers/openai.yaml`**: OpenAI V2 manifest — GPT-5.x, MCP client, Computer Use (preview), full multimodal
- **`v2/providers/anthropic.yaml`**: Anthropic V2 manifest — Claude Opus 4.6, MCP creator, Computer Use (beta), vision
- **`v2/providers/google.yaml`**: Google V2 manifest — Gemini 3, Computer Use (GA), audio+video input, MCP client
- **`v2/providers/deepseek.yaml`**: DeepSeek V2 manifest — V3.2, OpenAI-compatible, MoE architecture
- **`v2/providers/moonshot.yaml`**: Moonshot V2 manifest — Kimi K2.5, Agent Swarm, video support
- **`v2/providers/zhipu.yaml`**: Zhipu V2 manifest — GLM-5, agentic engineering, SOTA open-source coding

### Changed

#### Schema Enhancements
- **`schemas/v2/mcp.json`**: Finalized — added conditional validation, error_handling, max_servers, timeout_ms
- **`schemas/v2/computer-use.json`**: Finalized — added file operations, config_method, max_actions_per_turn, conditional validation
- **`schemas/v2/multimodal.json`**: Finalized — added encoding_methods, sample_rates, input/output modality lists for omni_mode, conditional validation
- **`schemas/v2/provider.json`**: Added `$ref` to provider-contract.json and context-policy.json

#### Documentation
- **`docs/V2_ARCHITECTURE.md`**: Upgraded from v0.2 Draft to **v1.0 Finalized** — new sections: ProviderContract (§10), ProviderDriver Architecture (§11), Context Management Policy (§12), expanded Decision Log

### Ecosystem Status
- **ai-protocol**: v0.6.0 (v2-beta) — 12 V2 schemas, 6 formal providers, 3 alpha providers
- **ai-lib-rust**: v0.7.1 (V2 runtime adaptation in progress)
- **ai-lib-python**: v0.6.0 (V2 runtime adaptation in progress)

---

## 0.5.0 (2026-02-15) - V2 Architecture & Cross-Runtime Compliance

This release introduces the V2 protocol architecture, standardized error codes, capability declarations, and a cross-runtime compliance test suite.

### Added

#### V2 Protocol Architecture
- **`docs/V2_ARCHITECTURE.md`**: Three-layer pyramid (L1 Core / L2 Extensions / L3 Environment) with concentric circle manifest model
- **`v2-alpha/spec.yaml`**: V2 manifest specification — Ring 1 (Core Skeleton), Ring 2 (Capability Mapping), Ring 3 (Advanced Extensions)
- **`v2-alpha/providers/`**: 3 V2-alpha provider manifests (OpenAI, Anthropic, Gemini) in three-ring format

#### Unified Error Code System
- **`schemas/v2/errors.json`**: JSON Schema for standard error response format
- **`schemas/v2/error-codes.yaml`**: 13 standard error codes (E1001–E9999) with categories, HTTP status mappings, and retry/fallback semantics

#### Capability Declaration
- **`schemas/v2/capabilities.json`**: Capability declaration schema with required/optional capabilities and feature flags

#### Cross-Runtime Compliance Testing
- **`tests/compliance/`**: Declarative YAML-based test suite with 42 test cases across 6 categories
- **`tests/compliance/schema.json`**: Test case schema definition
- **`docs/CROSS_RUNTIME.md`**: 5 mandatory consistency rules + 8 permitted differences + verification checklist
- Both Rust and Python runtimes pass 20/20 compliance tests

#### V2 Schema Upgrades
- **`schemas/v2/endpoint.json`**: V2 endpoint configuration schema
- **`schemas/v2/provider.json`**: V2 provider manifest schema (three-ring model)

### Changed
- **`scripts/validate.js`**: V2 schema `$ref` resolution support
- **`.gitignore`**: Strengthened wildcard patterns for work/internal documents

### Ecosystem Status
- **ai-lib-rust**: v0.7.0 (V2 error codes + feature flags + structured output)
- **ai-lib-python**: v0.6.0 (V2 error codes + feature flags + compliance tests)
- **Cross-runtime compliance**: 100% (20/20 test cases, both runtimes)

## 0.4.0 (2026-02-05) - Documentation & Examples Release

This release focuses on documentation, examples, and developer experience improvements.

### Added

- **3 New User Documentation Files**:
  - `docs/GETTING_STARTED.md` - Comprehensive user guide for beginners
  - `docs/CONTRIBUTING_PROVIDER.md` - Step-by-step tutorial for adding new providers
  - `docs/RUNTIME_INTEGRATION.md` - In-depth guide for integrating AI-Protocol into runtimes

- **4 New Example Configurations**:
  - `examples/simple_streaming.yaml` - Minimal streaming chat example
  - `examples/batch_processing.yaml` - Batch processing patterns with Anthropic
  - `examples/multimodal_vision.yaml` - Vision/multimodal example with Gemini
  - `examples/function_calling.yaml` - Function/tool calling patterns with OpenAI

### Improved

- **Documentation Coverage**: Significantly expanded documentation for:
  - Getting started with Python and Runtimes
  - Provider contribution workflow
  - Runtime implementation patterns
  - Example code snippets for common use cases

- **Example Quality**: New examples include:
  - Detailed comments explaining configurations
  - Usage patterns and best practices
  - Real-world code examples (Python and Rust)
  - Error handling and troubleshooting tips

### Changed

- **README.md**: Documentation references updated to point to new docs

### Documentation

Total documentation files: 8 (up from 4)

| Directory | Files | Description |
|-----------|-------|-------------|
| `docs/` | 5 | Specification, CI validation, user guides |
| `examples/` | 5 | Configuration examples for common patterns |

## 0.3.5 (2026-01-31)

### Added
- **6 New Model Configuration Files**: Added comprehensive model registries
  - Perplexity: Sonar Small/Large/Huge (Online + Chat variants)
  - Baichuan: Baichuan 2/3/4 series
  - Moonshot (Kimi): moonshot-v1-8k/32k/128k, kimi-latest
  - Yi (01.AI): yi-large, yi-medium-200k, yi-vision, yi-spark
  - Zhipu (GLM): glm-4-plus, glm-4-air, glm-4-flash, glm-4-long (1M context)
  - Cohere: Command R/R+, Embed v3, Rerank v3
- **MiniMax Models**: Added abab 5.5/6.5 series, embedding, and speech models

### Changed
- **7 Providers Enhanced to v1.5**: Complete configuration overhaul
  - Perplexity, Baichuan, Moonshot, Yi, OpenRouter, Zhipu, Cohere
  - All now include: streaming event_map, error_classification, tooling, retry_policy
- **MiniMax Provider**: Upgraded from basic v1.1 to complete v1.5 configuration
- **README**: Added runtime installation instructions (Python pip, Rust cargo)
- **Runtime Versions**: Updated to ai-lib-python v0.4.0, ai-lib-rust v0.6.5

### Removed
- Internal code review documents (moved to separate tracking)

### Statistics
- Total Providers: 30
- Total Model Configurations: 28
- Validation Files: 68

## 0.3.0 (2026-01-31)

### Added
- **11 New Providers**: Expanded coverage to 30+ AI providers
  - Global: Fireworks AI, Replicate, AI21 Labs, Cerebras, Lepton AI
  - China: Doubao (ByteDance), Baidu ERNIE, iFlytek Spark, Tencent Hunyuan, SenseNova, Tiangong
- **11 New Model Configurations**: Comprehensive model registries for all new providers
  - Fireworks: Llama 3.1, Mixtral, Qwen, DeepSeek, FireFunction
  - AI21: Jamba 1.5 series, Jurassic-2
  - Cerebras: Llama 3.1/3.3, Qwen 2.5, DeepSeek R1 Distill
  - Lepton/Replicate: Various open-source models
  - China providers: Full model lineups including Pro/Lite/Vision variants
- **Version Semantics Documentation**: Added Section 11 to SPEC.md covering layered versioning model and runtime alignment guidelines
- **Schema URL Versioning**: Support for semantic version tags in `$schema` URLs (e.g., `v0.3.0`)

### Changed
- **README**: Updated to reflect 30+ providers with comprehensive provider listings
- **README_CN**: Aligned with English version, added Release Packaging Policy section
- **Python Runtime**: Updated status from "planned" to "implemented" (ai-lib-python is now available)

### Fixed
- **CI Workflow**: Fixed fact-check workflow secrets access syntax for GitHub Actions

## 0.2.1 (2026-01-28)

### Added
- Model registry verification: `verification` block on model entries (`status`, `verified_at`, `source`, `notes`); schema-enforced.
- Optional runtime fact-check script `scripts/fact-check-models.js`: compare registry to providers' list_models (no API keys required for the registry).
- Documentation: [docs/FACT_CHECKING_MODELS.md](docs/FACT_CHECKING_MODELS.md) ? sustainability-first (document verification primary; runtime tool optional).

### Changed
- Build script: recursive file count fixed so "Converted N files" includes all YAML under v1/ and v2-alpha/.
- README / README_CN: project structure includes `docs/`; validation vs build clarified; link to fact-check doc.

### Fixed
- Build.js: `processDirectory` return value from subdirectories is now accumulated into total converted file count.

---

## 0.2.0 (2026-01-27)

### Added
- **Spec Schema**: New `schemas/spec.json` for validating specification files (`v1/spec.yaml`, `v2-alpha/spec.yaml`)
- **Spec Validation**: `npm run validate:specs` command for dedicated spec file validation
- **Build Cleaning**: Automatic dist directory cleaning before each build to prevent stale files
- **CI Caching**: npm cache enabled in CI workflow for faster builds

### Changed
- **CI Workflow**: Changed from `npm install` to `npm ci` for reproducible builds
- **Documentation**: All documentation converted to English as primary language
- **README**: Updated bilingual README files (EN/CN) with latest features and commands

### Removed
- **Deprecated Script**: Removed `scripts/validate-configs.sh` (superseded by `validate.js`)

### Fixed
- **Lockfile**: Added `package-lock.json` for consistent dependency versions
- **Gitignore**: Removed `package-lock.json` from `.gitignore` to enable `npm ci`

## 1.1.1 (2026-01-04)

### Added
- Schema: root `provider_id` (optional) for auth lookup / compatibility aliases.
- Schema: `streaming.usage_path` for streaming usage extraction.
- Schema: `tooling.tool_use.index_path` to support streaming tool-call linkage when id is not present on every delta.
- Spec: `standard_schema.telemetry.feedback_events.ChoiceSelection` (opt-in; no hosted server implied).

### Clarified
- Spec: `tool_choice` may be a string policy or a provider-specific object.

