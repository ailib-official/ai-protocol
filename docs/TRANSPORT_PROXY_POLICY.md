# Cross-Runtime HTTP Proxy Policy

> ALR-TRN-001 / coordination standard (2026-07-08)

## Principles

All ai-lib runtimes should follow the same **industry-standard** proxy conventions used by curl, git, npm, and mainstream HTTP clients:

1. Respect process environment variables: `http_proxy`, `https_proxy`, `no_proxy` (and uppercase variants).
2. Do **not** disable system proxy detection in the default/direct HTTP client path.
3. Do **not** implement provider-region or “smart” proxy heuristics in application code.
4. Optional explicit override: `AI_PROXY_URL` supplements (does not replace) system env vars where supported.

`NO_PROXY` is the standard bypass mechanism for hosts that must connect directly.

## Runtime behavior (audit 2026-07-08)

| Runtime | Default direct client | System `http_proxy` / `https_proxy` | `no_proxy` | `AI_PROXY_URL` | Notes |
|---------|----------------------|-------------------------------------|------------|----------------|-------|
| **ai-lib-rust** | reqwest `auto_sys_proxy` (fixed ALR-TRN-001) | Yes | Yes | Optional failover route | Removed erroneous `no_proxy()` on direct route |
| **ai-lib-python** | httpx `trust_env=False` unless `AI_HTTP_TRUST_ENV=1` | Opt-in only | Opt-in only | When `trust_env` enabled | Differs from Rust default; set `AI_HTTP_TRUST_ENV=1` for parity |
| **ai-lib-ts** | `fetch()` (Node/undici) | No automatic proxy in E-layer | N/A | Misnamed `proxyUrl` option (base URL override, not HTTP proxy) | Proxy wiring belongs in host/P-layer or future transport work |
| **ai-lib-go** | `http.Client` default `Transport` | Yes (`ProxyFromEnvironment`) | Yes | Host may pass custom `http.Client` via `WithHTTPClient` | Compliant when default client is used |

## VelaClaw host boundary

VelaClaw `[proxy]` in `config.toml` configures **VelaClaw-owned HTTP clients** (channels, tools, tunnel, memory) via `build_runtime_proxy_client()`.

LLM API traffic through `ai-lib-rust` `AiClient` / `HttpTransport` follows the Rust row above and **does not** read `[proxy]` from `config.toml`. After ALR-TRN-001, set `http_proxy` / `https_proxy` / `no_proxy` in the process environment (or `AI_PROXY_URL` for explicit failover) for LLM egress.

See `active/projects/velaclaw/docs/PROXY_CONFIG.md` for operator guidance.

## References

- ai-lib-rust: `crates/ai-lib-core/src/transport/mod.rs`
- ai-lib-python: `src/ai_lib_python/transport/http.py` (`AI_HTTP_TRUST_ENV`)
- ai-lib-ts: `src/transport/http.ts`
- ai-lib-go: `pkg/ailib/builder.go` (`WithHTTPClient`)
- Task: `ai-lib-plans/active/projects/ai-lib-rust/tasks/ALR-TRN-001-transport-proxy-behavior.yaml`
