# AI-Protocol: Data-State Rulebook

AI-Protocol is a standardized protocol specification in the field of AI model integration, decoupling "data-state rulebook" from "language-state runtime" to provide unified infrastructure for the AI ecosystem.

## 🎯 Project Vision

- **Data-State Rulebook**: Focuses on defining standardized interfaces and behavioral norms for AI models
- **Language-State Runtime**: Focuses on implementing efficient, scalable AI model runtimes (like ai-lib)
- **Ecosystem Decoupling**: Protocol specifications are separated from implementations, supporting unified ecosystems across multiple languages and frameworks

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
└── scripts/                   # Maintenance scripts
```

## 🔧 Core Concepts

### 1. Operator-based Design

AI-Protocol standardizes AI model behavior through the concept of **operators**:

- **Parameter Operators**: Standardized parameter mapping (`temperature`, `max_tokens`, `stream`, etc.)
- **Event Operators**: Standardized streaming events (`PartialContentDelta`, `ToolCallStarted`, etc.)
- **Capability Operators**: Standardized capability declarations (`chat`, `vision`, `tools`, `streaming`, etc.)

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
$schema: "https://spec.ai-protocol.org/schemas/v1.json"

id: anthropic
protocol_version: "1.1"

streaming:
  decoder:
    format: "sse"
    strategy: "anthropic_event_stream"

  event_map:
    - match: { "path": "$.type", "op": "eq", "value": "content_block_delta" }
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"
```

### 2. Model Registration Example

```yaml
# v1/models/claude.yaml
$schema: "https://spec.ai-protocol.org/schemas/v1.json"

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

### 3. Runtime Integration

```rust
// Dynamic loading example in ai-lib
use ai_protocol::{ProtocolRegistry, ProviderConfig};

let registry = ProtocolRegistry::new();
let provider = registry.load_provider("anthropic").await?;
let model = registry.get_model("claude-3-5-sonnet").await?;
```

## 📋 Validation and Testing

```bash
# Run JSON Schema validation
npm install -g ajv-cli
ajv validate -s schemas/v1.json -d "v1/providers/*.yaml"

# Run compatibility tests
cargo test --package ai-protocol-validation
```

Validation scripts are also available in `scripts/validate-configs.sh`.

## 🛣️ Roadmap

### v1.x (Current Stable)
- ✅ Mainstream AI provider support (OpenAI, Anthropic, Gemini, etc.)
- ✅ Standardized parameters and event normalization
- ✅ Tool calling and streaming response support
- ✅ JSON Schema constraints

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

1. Create a new file under `v1/providers/`
2. Follow JSON Schema specifications
3. Add corresponding model configurations
4. Submit PR with test cases

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

- **[ai-lib](https://github.com/your-org/ai-lib)**: Rust runtime implementation
- **[ai-lib-python](https://github.com/your-org/ai-lib-python)**: Python runtime implementation (planned)
- **[ai-protocol-registry](https://github.com/your-org/ai-protocol-registry)**: Community configuration repository

---

**AI-Protocol** abstracts the complexity of AI models into standardized protocols, allowing developers to focus on business logic rather than provider adaptation.
