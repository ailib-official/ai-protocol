# Changelog

All notable changes to AI-Protocol specifications and schemas will be documented here.

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

