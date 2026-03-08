# AI-Protocol: Data-State Rulebook

**AI-Protocol is a provider-agnostic specification for all AI models, standardizing how we interact with intelligence, regardless of modality** (text, vision, audio, video). We decouple the "data-state rulebook" from the "language-state runtime" to provide unified infrastructure for the AI ecosystem.

**We complement standards like [MCP](https://modelcontextprotocol.io) by providing a declarative runtime for raw API normalization.** While MCP focuses on high-level protocols for tool calling and context management, AI-Protocol focuses on standardizing and normalizing low-level API calls, enabling runtimes to uniformly handle APIs from different providers.

## 🎯 Project Vision

- **Data-State Rulebook**: Focuses on defining standardized interfaces and behavioral norms for AI models
- **Language-State Runtime**: Focuses on implementing efficient, scalable AI model runtimes (like ai-lib-rust)
- **Ecosystem Decoupling**: Protocol specifications are separated from implementations, supporting unified ecosystems across multiple languages and frameworks
- **Provider-Agnostic**: Unifies APIs from different AI providers, enabling true cross-provider interoperability
- **Cross-Modality Support**: Standardizes interactions across text, vision, audio, video, and other modalities

## 📁 Project Structure

```
ai-protocol/
├── schemas/                    # JSON Schema validation specifications
│   ├── v1.json                # v1.x provider/model configuration Schema
│   ├── spec.json              # Specification file (spec.yaml) Schema
│   └── v2/                    # V2 protocol schemas
│       ├── provider.json      # V2 provider manifest schema (three-ring model)
│       ├── capabilities.json  # Capability declaration schema
│       ├── errors.json        # Standard error code definitions (13 codes)
│       ├── endpoint.json      # Endpoint configuration schema
│       ├── availability.json  # Availability schema
│       ├── regions.json       # Region configuration schema
│       ├── mcp.json           # MCP integration schema
│       ├── computer-use.json  # Computer Use abstraction schema
│       ├── multimodal.json    # Extended multimodal capabilities schema
│       ├── provider-contract.json # Provider contract schema
│       └── context-policy.json # Context management policy schema
├── v1/                        # v1.x stable version specification
│   ├── spec.yaml              # Basic specifications: standard parameters, event enumeration
│   ├── providers/             # Provider configurations (split by vendor for easy PR)
│   │   ├── openai.yaml        # OpenAI compatible interface
│   │   ├── anthropic.yaml     # Anthropic Claude interface
│   │   ├── gemini.yaml        # Google Gemini interface
│   │   └── ...                # 30+ providers (see full list below)
│   └── models/                # Model instance registry
│       ├── gpt.yaml           # GPT series models
│       ├── claude.yaml        # Claude series models
│       └── ...                # More models
├── v2/                        # v2 formal provider manifests
│   └── providers/             # 6 V2 provider manifests (OpenAI, Anthropic, Google, etc.)
├── v2-alpha/                  # v2-alpha experimental version
│   └── spec.yaml              # Experimental operator definitions
├── tests/                     # Cross-runtime compliance test suite
│   └── compliance/            # YAML-defined test cases for Rust/Python consistency
├── examples/                  # Configuration examples
├── docs/                      # Documentation
│   ├── V2_ARCHITECTURE.md     # V2 three-layer pyramid architecture design
│   ├── SPEC.md                # Provider manifest specification
│   └── ...                    # More documentation
├── research/                  # Research documents (official API excerpts and verification)
│   └── providers/             # Provider-specific official documentation research
└── scripts/                   # Maintenance scripts
```

## 🔧 Core Concepts

### 1. Operator-based Design

AI-Protocol standardizes AI model behavior through the concept of **operators**:

- **Parameter Operators**: Standardized parameter mapping (`temperature`, `max_tokens`, `stream`, etc.)
- **Event Operators**: Standardized streaming events (`PartialContentDelta`, `ToolCallStarted`, `StreamError`, etc.)
- **Capability Operators**: Standardized capability declarations (`chat`, `vision`, `tools`, `streaming`, `multimodal`, etc.)
- **Error Handling Operators**: Standardized error classification, rate limiting, and retry strategies (`error_classification`, `retry_policy`, `rate_limit_headers`)

### 2. Version Isolation

- **v1.x**: Production environment stable version, supporting current mainstream AI models
- **v2-alpha**: Experimental version, exploring multimodal streams, real-time instructions, and other cutting-edge features
- **Schema Constraints**: Every configuration file is strictly validated through JSON Schema

### 3. Modular Maintenance

- **Provider Independence**: Each AI provider's configuration is maintained independently, facilitating community contributions
- **Model Registration**: Model instances are registered as configuration files referencing provider definitions
- **PR Friendly**: Modifying a single provider won't affect other configurations

## 🚀 Quick Start

### 1. Provider Configuration Example

```yaml
# v1/providers/anthropic.yaml
$schema: "https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json"

id: anthropic
protocol_version: "1.5"

streaming:
  decoder:
    format: "anthropic_sse"
    strategy: "anthropic_event_stream"

  event_map:
    - match: "$.type == 'content_block_delta' && $.delta.type == 'text_delta'"
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"
```

> **Schema URL Best Practice**: You can pin the `$schema` URL to a specific release tag for version stability:
> - `https://raw.githubusercontent.com/hiddenpath/ai-protocol/v0.2.1/schemas/v1.json` (pinned to release)
> - `https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json` (latest on main)

### 2. Error Handling and Rate Limiting Example

```yaml
# v1/providers/openai.yaml (excerpt)
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "429": "rate_limited"  # Could be rate limit or quota exhausted
    "500": "server_error"

rate_limit_headers:
  requests_limit: "x-ratelimit-limit-requests"
  requests_remaining: "x-ratelimit-remaining-requests"
  retry_after: null  # OpenAI doesn't use standard Retry-After

retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  jitter: "full"
  retry_on_http_status: [429, 500]
  notes:
    - "429 may be rate limit or quota exhausted; runtimes should inspect error messages"
```

### 3. Model Registration Example

```yaml
# v1/models/claude.yaml
$schema: "https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json"

models:
  claude-3-5-sonnet:
    provider: anthropic
    model_id: "claude-3-5-sonnet-20241022"
    context_window: 200000
    capabilities: [chat, vision, tools, streaming, agentic, reasoning]
    pricing:
      input_per_token: 0.000003
      output_per_token: 0.000015
```

### 4. Runtime Integration

```rust
// Dynamic loading example in ai-lib-rust
use ai_lib_rust::protocol::ProtocolLoader;

// By default, the loader prioritizes the `dist/` directory (JSON) for production efficiency,
// falling back to `v1/` (YAML) for development convenience if JSON is missing.
let loader = ProtocolLoader::new();
let provider = loader.load_provider("anthropic").await?;
let model = loader.load_model("anthropic/claude-3-5-sonnet").await?;
```

## 📋 Validation and Testing

```bash
# Install dependencies
npm install

# Run JSON Schema validation (all)
npm run validate

# Run specific validations
npm run validate:providers   # Validate provider configs only
npm run validate:models      # Validate model configs only
npm run validate:examples    # Validate examples only
npm run validate:specs       # Validate spec files only
npm run validate:schemas     # Validate JSON schema syntax only

# Execution governance automation
npm run drift:check          # Detect P0 provider/fixture/case drift
npm run gate:manifest-consumption   # Cross-repo latest-manifest consumption gate
npm run gate:compliance-matrix      # Cross-repo full compliance matrix gate
npm run gate:fullchain             # One-shot governance fullchain gate
npm run release:gate         # Evaluate release gate status
node scripts/drift-detect.js --report-only   # Advisory drift report (non-blocking)
node scripts/release-gate.js --report-only   # Advisory release gate report (non-blocking)
```

The canonical validation script is `scripts/validate.js`, which uses AJV v8 with JSON Schema 2020-12 and ajv-formats.  
Execution governance scripts:
- `scripts/drift-detect.js`: verifies P0 provider readiness coverage across v2 manifests, compliance fixtures, and loading cases
- `scripts/gate-manifest-consumption.js`: runs protocol + Rust/Python/TS latest-manifest consumption checks and writes gate report (`reports/manifest-gates/`)
- `scripts/gate-compliance-matrix.js`: runs protocol + Rust/Python/TS compliance matrix checks and writes gate report (`reports/compliance-gates/`)
- `scripts/gate-fullchain.js`: orchestrates drift + manifest + compliance + release gates in one run (`reports/fullchain-gates/`)
- `scripts/release-gate.js`: computes pass/blocked decision from rollout metrics input (default: `scripts/release-gate-input.example.json`)
- `report-only` mode (`--report-only`) is available for drift/release gates to support advisory CI rollout without immediate hard blocking
Optional runtime model verification (document-first; no API keys required for the registry): see [docs/FACT_CHECKING_MODELS.md](docs/FACT_CHECKING_MODELS.md).

### Wave-3 Gate Promotion Policy (PT-035)

Required/report-only governance boundaries:

- **PR / manual review path**: run report-only gates for trend visibility and low-friction iteration.
- **`main` push path**: run required fullchain gate (`node scripts/gate-fullchain.js`) as blocking baseline.
- **Release readiness baseline**: keep both required and report-only evidence artifacts for every promotion cycle.

Rollback policy:

- If a production-critical gate starts failing due to transient infra or dependency outages, temporarily downgrade to report-only while preserving evidence artifacts.
- Downgrade decisions must include explicit closure target and recovery command path (`npm run gate:fullchain`).
- Return to required mode immediately after recovery evidence is recorded.

## 📦 Build & Distribution

AI-Protocol is distributed as pre-compiled JSON files to ensure runtime efficiency and zero-parsing overhead.

```bash
# Validate first, then build JSON artifacts
npm run validate
npm run build
```

Build: run `npm run validate` first. This command then:
1.  Cleans the `dist/` directory to remove stale files from previous builds.
2.  Converts all YAML under `v1/`, `v2/`, and `v2-alpha/` into JSON in `dist/`.
3.  Generates a `dist/index.json` manifest index with version information.

Runtimes (like `ai-lib-rust`) should consume the `dist/` directory directly.

### CI/CD Pipeline

The GitHub Actions workflow (`validate.yml`) automatically:
- Validates all configurations using `npm ci` + `npm run validate`
- Builds JSON artifacts using `npm run build`
- Uploads the `dist/` folder as a build artifact
- Runs additional yamllint checks for YAML style (non-blocking)
- `governance-report.yml` runs drift/release gates in report-only mode and archives JSON evidence artifacts

See [docs/CI_VALIDATION_EXPLAINED.md](docs/CI_VALIDATION_EXPLAINED.md) for detailed CI documentation.

## 🛣️ Roadmap

### v1.x (Current Stable)
- ✅ **30+ AI providers** supported across global and China regions
- ✅ Standardized parameters and event normalization
- ✅ Tool calling and streaming response support
- ✅ JSON Schema constraints
- ✅ Error handling and classification standardization (`error_classification`, 13 standard error classes)
- ✅ Rate limiting and retry policy standardization (`rate_limit_headers`, `retry_policy`)
- ✅ API family declarations (`api_families`, `endpoints`) to avoid request/response model confusion
- ✅ Termination reason normalization (`termination_reasons`) unified across providers

#### Supported Providers

**Global Providers:**
- OpenAI, Anthropic, Google Gemini, Groq, Mistral, Cohere, Perplexity
- Together AI, DeepInfra, OpenRouter, Azure OpenAI, NVIDIA API Catalog (NVIDIA Build)
- Fireworks AI, Replicate, AI21 Labs, Cerebras, Lepton AI

**China Region Providers:**
- Qwen (Alibaba), DeepSeek, Zhipu GLM
- Doubao (ByteDance), Baidu ERNIE, iFlytek Spark
- Tencent Hunyuan, SenseNova, Tiangong
- Moonshot/Kimi, MiniMax, Baichuan, Yi
- SiliconFlow

### v2 (In Progress)
- 🔄 **V2 Three-Layer Pyramid Architecture** (L1 Core / L2 Extensions / L3 Environment)
- 🔄 **Unified Error Code System** — standardized error codes across all providers
- 🔄 **Capability Declaration Mechanism** — structured `required`/`optional` capabilities
- 🔄 **Feature Flag Mechanism** — load only what you need
- 🔄 **STT / TTS / Rerank** — speech-to-text, text-to-speech, document reranking (OpenAI, Cohere, Jina)
- 🔄 **Compliance Test Suite** — machine-verified cross-runtime consistency

### v2-alpha (Experimental)
- 🔄 Multimodal stream interleaving (`FrameInterleave` operator)
- 🔄 Real-time instructions (`StateSync` operator)
- 🔄 Schema-less mapping
- 🔄 Advanced tool accumulation patterns

### v2.x (Future Plans)
- 📅 ProviderContract abstraction
- 📅 CLI toolchain (`init`, `validate`, `convert`, `check-compat`)
- 📅 WASM support for browser/Edge execution
- 📅 Framework integrations (LangChain, LlamaIndex)

## 🤝 Contribution Guide

### Adding New Providers

1. Create a new file under `v1/providers/` (e.g., `new-provider.yaml`)
2. Follow JSON Schema specifications (`schemas/v1.json`)
3. Add official documentation research under `research/providers/` (`new-provider.md`) with VERIFIED evidence
4. Add corresponding model configurations under `v1/models/`
5. Submit PR with test cases and validation results

**All configurations are hosted in this repository**, where community contributions follow the same version control and validation process as official configurations.

### Adding New Operators

1. Define new operators in the corresponding version's `spec.yaml`
2. Update JSON Schema
3. Implement operator logic in runtime
4. Add example configurations

## 📄 License

This project is licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT License ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you shall be dual licensed as above, without any additional terms or conditions.

## 🔗 Related Projects & Runtime Installation

AI-Protocol has official runtime implementations in multiple languages:

### Python Runtime (v0.7.1)

```bash
# Install from PyPI
pip install ai-lib-python

# Or with optional dependencies
pip install ai-lib-python[all]
```

```python
from ai_lib import Client

# Unified API across all providers
client = Client(provider="openai")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

📦 **PyPI**: [ai-lib-python](https://pypi.org/project/ai-lib-python/) | 📖 **Docs**: [github.com/hiddenpath/ai-lib-python](https://github.com/hiddenpath/ai-lib-python)

### Rust Runtime (v0.8.1)

```toml
# Add to Cargo.toml
[dependencies]
ai-lib-rust = "0.8.1"
```

```rust
use ai_lib_rust::Client;

// Unified API across all providers
let client = Client::new("anthropic")?;
let response = client.chat()
    .model("claude-3-5-sonnet-20241022")
    .message("user", "Hello!")
    .send()
    .await?;
```

📦 **Crates.io**: [ai-lib-rust](https://crates.io/crates/ai-lib-rust) | 📖 **Docs**: [github.com/hiddenpath/ai-lib-rust](https://github.com/hiddenpath/ai-lib-rust)

### ai-protocol-mock (v0.1.3)

Unified mock server for testing runtimes without real API calls. Provides manifest-driven HTTP mock (OpenAI/Anthropic formats), STT/TTS/Rerank endpoints, and MCP JSON-RPC mock.

```bash
# Start mock server
cd ai-protocol-mock && docker-compose up -d

# Use with runtimes
MOCK_HTTP_URL=http://localhost:4010 pytest tests/  # ai-lib-python
MOCK_HTTP_URL=http://localhost:4010 cargo test -- --ignored  # ai-lib-rust
```

📖 **Repo**: [github.com/hiddenpath/ai-protocol-mock](https://github.com/hiddenpath/ai-protocol-mock)

### Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      AI-Protocol                            │
│            (Provider-agnostic Specification)                │
├─────────────────────────────────────────────────────────────┤
│  schemas/     │  v1/providers/  │  v1/models/              │
│  JSON Schema  │  30+ Providers  │  Model Registry          │
└───────────────┴────────────────┴───────────────────────────┘
                          │
            ┌─────────────┼─────────────┬─────────────┐
            ▼             ▼             ▼             ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ ai-lib-rust  │ │ai-lib-python │ │ai-protocol-  │ │  Your App    │
    │   (Rust)     │ │  (Python)    │ │mock (tests)  │ │   (Any)      │
    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

> **Note**: AI-Protocol itself already includes configuration registry functionality. Community contributions for new provider configurations and model registrations can be submitted directly via PRs to this repository's `v1/providers/` and `v1/models/` directories, without needing a separate configuration repository.

---

**AI-Protocol** abstracts the complexity of AI models into standardized protocols, allowing developers to focus on business logic rather than provider adaptation.
