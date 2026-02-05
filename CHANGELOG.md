# Changelog

All notable changes to AI-Protocol specifications and schemas will be documented here.

## 0.4.0 (2026-02-05) - Documentation & Examples Release ✨

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

