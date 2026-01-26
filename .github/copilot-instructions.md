# ai-lib-rust Copilot 编码代理说明
# Copilot Coding Agent Instructions for ai-lib-rust

## Project Overview
- **ai-lib-rust** is a high-performance, declarative AI SDK for Rust, powered by **AI-Protocol**.
- It decouples provider logic from the runtime using `ProtocolManifests` (YAML/JSON), requiring **zero code changes** to add new providers.
- The core architecture revolves around `ProtocolLoader` (data state) and `AiClient` (execution state).

## Key Components
- `src/client/`: Main client logic (`AiClient`, `AiClientBuilder`).
- `src/protocol/`: **Core Protocol Layer**.
    - `loader.rs`: Loads manifests from `dist/` (JSON) or local sources.
    - `validator.rs`: Validates manifests against schema.
- `src/transport/`: HTTP transport layer (Reqwest).
- `src/pipeline/`: Request/Response processing pipeline (Tokenizers, Templating).

## Patterns & Conventions
- **Protocol-First**: Everything is driven by the `ProtocolRegistry`. Providers are data, not code.
- **Client Usage**: Use `AiClient::builder().with_provider(id).build()` to create a client instance.
- **Manifest Loading**: Favor loading pre-compiled JSONs from `dist/` for production.
- **Error Handling**: Uses `AiLibError` mapped from `ProtocolError`.

## Developer Workflow
- **Build**: `cargo build` or `cargo check`.
- **Test**: Example-based testing in `examples/` (run with `cargo run --example <name>`). No standard Rust tests in `tests/` yet.
- **Debug**: Use example files for provider/network debugging.
- **Publish**: `cargo publish` for crates.io; force push for GitHub if needed.

## Integration Points
- No external SDK dependencies for providers; all HTTP APIs are called directly.
- Proxy and API keys are configured via environment variables.

## Example Usage
```rust
use ai_lib_rust::client::AiClient;
use ai_lib_rust::protocol::ProtocolLoader;

// Load protocol
let loader = ProtocolLoader::new();
let provider = loader.load_provider("groq").await?;

// Initialize client
let client = AiClient::builder()
    .with_provider_config(provider)
    .build()?;

// Send request
let response = client.chat().say("Hello").await?;
```

## References
- See `README.md` for build instructions (`npm run build`).
- Key files: `src/protocol/loader.rs`, `src/client.rs`.
---
If any section is unclear or missing, please provide feedback for further refinement.
