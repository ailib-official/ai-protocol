# Release 0.2.1 (2026-01-28)

## Summary

This release adds **model registry verification** (document-first, no API keys required for the registry), an **optional runtime fact-check script**, and aligns documentation (EN/CN) with the current codebase.

## Added

- **Model registry verification**: Every model entry in `v1/models/*.yaml` may include a `verification` block (`status`, `verified_at`, `source`, `notes`), enforced by the v1 schema.
- **Optional runtime fact-check script** (`scripts/fact-check-models.js`): Compares registry entries to providers' `list_models` (or equivalent). No API keys are required for the registry itself; the script is an optional tool for contributors who have keys.
- **Documentation** [docs/FACT_CHECKING_MODELS.md](docs/FACT_CHECKING_MODELS.md): Sustainability-first approach — primary verification via **public API reference / documentation**; runtime script is optional.

## Changed

- **Build script**: Recursive file count fixed so "Converted N files" includes all YAML under `v1/` and `v2-alpha/`.
- **README / README_CN**: Project structure includes `docs/`; validation vs build clarified; link to fact-check doc and `validate:specs` / fact-check npm scripts.

## Fixed

- **build.js**: `processDirectory` return value from subdirectories is now accumulated into the total converted file count.

---

**Full changelog**: https://github.com/hiddenpath/ai-protocol/compare/v0.2.0...v0.2.1
