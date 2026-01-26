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
│   └── v1.json                # v1.x stable version Schema
├── v1/                        # v1.x stable version specification
│   ├── spec.yaml              # Basic specifications: standard parameters, event enumeration
│   ├── providers/             # Provider configurations (split by vendor for easy PR)
│   │   ├── openai.yaml        # OpenAI compatible interface
│   │   ├── anthropic.yaml     # Anthropic Claude interface
│   │   ├── gemini.yaml        # Google Gemini interface
│   │   ├── groq.yaml          # Groq compatible interface
│   │   ├── deepseek.yaml      # DeepSeek compatible interface
│   │   ├── qwen.yaml          # Qwen (DashScope) compatible interface
│   │   └── ...                # More providers
│   └── models/                # Model instance registry
│       ├── gpt.yaml           # GPT series models
│       ├── claude.yaml        # Claude series models
│       └── ...                # More models
├── v2-alpha/                  # v2-alpha experimental version: multimodal and real-time features
│   ├── spec.yaml              # Experimental operator definitions
│   └── providers/             # Experimental provider configurations
├── examples/                  # Configuration examples
│   └── tool_accumulation.yaml # Tool accumulation pattern example
├── research/                  # Research documents (official API excerpts and verification)
│   └── providers/             # Provider-specific official documentation research
│       ├── openai.md          # OpenAI official API rules (VERIFIED)
│       ├── anthropic.md       # Anthropic official API rules (VERIFIED)
│       ├── gemini.md          # Gemini official API rules (VERIFIED)
│       └── ...                # More provider research
└── scripts/                   # Maintenance scripts
```

## 📦 Release Packaging Policy (What gets published)

To avoid publishing work/discussion/internal documents by default, release archives SHOULD exclude:
- `research/`
- `scripts/`
- `v2-alpha/`

The normative, publish-ready artifacts are:
- `schemas/`
- `v1/` (spec + providers + models)
- `examples/`
- `README.md`, `LICENSE-*`, `CHANGELOG.md`

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

let loader = ProtocolLoader::new();
let provider = loader.load_provider("anthropic").await?;
let model = loader.load_model("anthropic/claude-3-5-sonnet").await?;
```

## 📋 Validation and Testing

```bash
# Run JSON Schema validation (all)
npm run validate

# Run compatibility tests
cargo test --package ai-protocol-validation
```

Validation scripts are also available in `scripts/validate-configs.sh` and `scripts/validate.js`.

## 📦 Build & Distribution

AI-Protocol is distributed as pre-compiled JSON files to ensure runtime efficiency and zero-parsing overhead.

```bash
# Build JSON artifacts
npm run build
```

This command:
1.  Validates all YAML configuration files.
2.  Converts them into optimized JSON files in the `dist/` directory.
3.  Generates a `dist/index.json` manifest index.

Runtimes (like `ai-lib-rust`) should consume the `dist/` directory directly.

## 🛣️ Roadmap

### v1.x (Current Stable)
- ✅ Mainstream AI provider support (OpenAI, Anthropic, Gemini, Groq, DeepSeek, Qwen)
- ✅ Standardized parameters and event normalization
- ✅ Tool calling and streaming response support
- ✅ JSON Schema constraints
- ✅ Error handling and classification standardization (`error_classification`, 13 standard error classes)
- ✅ Rate limiting and retry policy standardization (`rate_limit_headers`, `retry_policy`)
- ✅ API family declarations (`api_families`, `endpoints`) to avoid request/response model confusion
- ✅ Termination reason normalization (`termination_reasons`) unified across providers

### v2-alpha (Experimental In Progress)
- 🔄 Multimodal stream interleaving (`FrameInterleave` operator)
- 🔄 Real-time instructions (`StateSync` operator)
- 🔄 Schema-less mapping (Schema-less Mapping)
- 🔄 Advanced tool accumulation patterns

### v2.x (Future Plans)
- 📅 Audio/video streaming processing
- 📅 Real-time collaborative sessions
- 📅 Model switching and migration
- 📅 Performance monitoring and QoS

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

## 🔗 Related Projects

- **[ai-lib-rust](https://github.com/hiddenpath/ai-lib-rust)**: Rust runtime implementation
- **[ai-lib-python](https://github.com/hiddenpath/ai-lib-python)**: Python runtime implementation (planned)

> **Note**: AI-Protocol itself already includes configuration registry functionality. Community contributions for new provider configurations and model registrations can be submitted directly via PRs to this repository's `v1/providers/` and `v1/models/` directories, without needing a separate configuration repository.

---

**AI-Protocol** abstracts the complexity of AI models into standardized protocols, allowing developers to focus on business logic rather than provider adaptation.
