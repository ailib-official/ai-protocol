# Changelog

All notable changes to AI-Protocol specifications and schemas will be documented here.

## 1.1.1 (2026-01-04)

### Added
- Schema: root `provider_id` (optional) for auth lookup / compatibility aliases.
- Schema: `streaming.usage_path` for streaming usage extraction.
- Schema: `tooling.tool_use.index_path` to support streaming tool-call linkage when id is not present on every delta.
- Spec: `standard_schema.telemetry.feedback_events.ChoiceSelection` (opt-in; no hosted server implied).

### Clarified
- Spec: `tool_choice` may be a string policy or a provider-specific object.

