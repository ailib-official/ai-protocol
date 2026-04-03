# Wave-5 / v1.0.0 RC gate checklist (PT-073)

Authoritative plan: `ai-lib-plans/.../WAVE5_EP_SEPARATION_AND_V1_PLAN_2026-04-01.md` (section 1.4: pre-1.0 breaking changes allowed).

This document mirrors the blocking items from task **PT-073**. Check boxes off when evidence exists (CI log, release artifact, or signed review).

## 1. Core-only compliance (blocking)

- [ ] **Rust** `cargo test -p ai-lib-core` — full compliance matrix PASS (workspace root: `ai-lib-rust`).
  - **Evidence (2026-04-03, local):** `COMPLIANCE_DIR=<ai-protocol>/tests/compliance cargo test -p ai-lib-core pt073_` — `protocol_loading` + `message_building` subset PASS (`crates/ai-lib-core/tests/pt073_compliance_subset.rs`). Remaining matrix types still run via `cargo test -p ai-lib-rust --test compliance`.
- [ ] **Python** — default / documented E-only install: `pytest tests/compliance/` PASS (no P modules on import path for runner).
- [ ] **TypeScript** — E-only surface: compliance suite against `@hiddenpath/ai-lib-ts/core` (or equivalent) PASS.
- [ ] **Go** — `go test ./...` + compliance PASS (already near core-only; confirm `internal/resilience` not required for E-only harness).

## 2. WASM compliance (blocking, PT-072)

- [ ] `rustup target add wasm32-wasip1` available on CI runners.
- [x] `cargo build -p ai-lib-wasm --target wasm32-wasip1 --release` PASS (2026-04-03); `ai-lib-core` builds as dependency of `ai-lib-wasm` for that target.
- [x] Binary size under **2 MB** (release `ai_lib_wasm.wasm` ~**1.24 MB**, 2026-04-03).
- [x] **Six** exported WASM functions per PT-061 Phase 1 spec (+ `ailib_out_*` / `ailib_err_*` accessors).
- [ ] `wasmtime` harness: **protocol_loading** + **message_building** compliance subset PASS (CLI smoke: `scripts/wasmtime-pt073-smoke.ps1` in `ai-lib-rust`; full in-wasm compliance runner still open).

## 3. E/P separation integrity (blocking)

- [ ] No P-module imports in core packages (Rust: static check `tests/compliance/ep-boundary/check_ep_boundary.py`; extend for Python/TS as needed).
- [ ] **ExecutionMetadata** contract present and JSON-schema aligned (`schemas/v2/execution-metadata.json`) on all four runtimes.
- [ ] **ai-lib-contact** (Rust) / **contact** (TS subpath, Python extra marker) builds and integrates against core.

## 4. Migration documentation (blocking)

- [ ] **CHANGELOG** per repo: crate/package names, breaking paths, optional facade behavior.
- [ ] Downstream consumers (e.g. spiderswitch) tracked: updated or explicit follow-up issue.

## 5. Governance gates (blocking)

- [ ] `npm run drift:check` — no critical findings.
- [ ] Fullchain / release gate — PASS in **required** mode when enforcing v1.0.
- [ ] Rollback drill evidence current.

## 6. Release

- [ ] Schema / protocol version tagged **v1.0.0** when ready.
- [ ] Release notes: E/P separation + WASM + migration.

---

**Status:** Template — do not treat all items as satisfied until CI and owners sign off.
