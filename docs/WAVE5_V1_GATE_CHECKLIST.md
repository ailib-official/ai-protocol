# Wave-5 / v1.0.0 RC gate checklist (PT-073)

Authoritative plan: `ai-lib-plans/.../WAVE5_EP_SEPARATION_AND_V1_PLAN_2026-04-01.md` (section 1.4: pre-1.0 breaking changes allowed).

This document mirrors the blocking items from task **PT-073**. Check boxes off when evidence exists (CI log, release artifact, or signed review).

## 1. Core-only compliance (blocking)

- [x] **Rust** `cargo test -p ai-lib-core` — full compliance matrix PASS (workspace root: `ai-lib-rust`).
  - **Evidence (2026-04-03, local):** `COMPLIANCE_DIR=<ai-protocol>/tests/compliance cargo test -p ai-lib-core --test compliance_from_core` — full YAML suite (shared `crates/ai-lib-core/tests/compliance_runner` with facade `cargo test -p ai-lib-rust --test compliance`). Default `cargo test -p ai-lib-core` also runs unit tests and other integration tests.
  - **CI (PT-073):** `.github/workflows/pt073-rust-core-wasm.yml` — green on main 2026-06-29 (run `28364691515`).
- [x] **Python** — E-only: `pt073-python-e-only.yml`; **full matrix:** `pt073-python-full.yml` (PR #4 `b30b831`, 2026-06-29).
- [x] **TypeScript** — E-only: `pt073-ts-core.yml`; **full matrix:** `pt073-ts-full.yml` / `test:compliance:full` (PR #4 `324e67a`, 2026-06-29).
- [x] **Go** — `go test ./...` + compliance PASS.
  - **CI (PT-073):** `.github/workflows/pt073-go.yml` — green on main 2026-06-29 (run `28380766175`; PR #2 `334ac74`).

## 2. WASM compliance (blocking, PT-072)

- [x] `rustup target add wasm32-wasip1` available on CI runners (`pt073-rust-core-wasm.yml`, 2026-06-29).
- [x] `cargo build -p ai-lib-wasm --target wasm32-wasip1 --release` PASS (2026-04-03); `ai-lib-core` builds as dependency of `ai-lib-wasm` for that target.
- [x] Binary size under **2 MB** (release `ai_lib_wasm.wasm` ~**1.24 MB**, 2026-04-03).
- [x] **Six** exported WASM functions per PT-061 Phase 1 spec (+ `ailib_out_*` / `ailib_err_*` accessors).
- [x] `wasmtime` harness: load manifest + `ailib_build_chat_request` PASS (2026-04-03): `cargo build -p ai-lib-wasm --target wasm32-wasip1 --release` then `cargo test -p ai-lib-wasmtime-harness --test wasm_compliance` (`crates/ai-lib-wasmtime-harness`; uses inline `ProtocolManifest`-complete YAML — stricter than compliance `protocol_loading` Value checks). Optional CLI smoke: `ai-lib-rust/scripts/wasmtime-pt073-smoke.ps1`.

## 3. E/P separation integrity (blocking)

- [ ] No P-module imports in core packages (Rust: static check `tests/compliance/ep-boundary/check_ep_boundary.py`; extend for Python/TS as needed).
- [ ] **ExecutionMetadata** contract present and JSON-schema aligned (`schemas/v2/execution-metadata.json`) on all four runtimes.
- [ ] **ai-lib-contact** (Rust) / **contact** (TS subpath, Python extra marker) builds and integrates against core.

## 4. Migration documentation (blocking)

- [x] **CHANGELOG** per repo: crate/package names, breaking paths, optional facade behavior.
  - Python PR #5 `f0fa875`, TS PR #5 `0df05ee` (2026-06-29); Rust/Go baseline per `PT-073d-CHANGELOG-AUDIT`.
- [ ] Downstream consumers (e.g. spiderswitch) tracked: updated or explicit follow-up issue.

## 5. Governance gates (blocking)

- [x] `npm run drift:check` — no critical findings (local 2026-06-29: 0 drifts; report `reports/drift/drift-2026-06-29T15-14-05-656Z.json`).
- [x] Fullchain / release gate — PASS in **required** mode (local 2026-06-29: `gate:fullchain` exit 0; report `reports/fullchain-gates/fullchain-gate-2026-06-29T15-23-06-754Z.json`). CI: `.github/workflows/governance-report.yml`.
- [ ] Rollback drill evidence current.

## 6. Release

- [ ] Schema / protocol version tagged **v1.0.0** when ready.
- [ ] Release notes: E/P separation + WASM + migration.

---

**Status:** Template — do not treat all items as satisfied until CI and owners sign off.
