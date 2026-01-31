# Changelog

All notable changes to AI-Protocol specifications and schemas will be documented here.

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

