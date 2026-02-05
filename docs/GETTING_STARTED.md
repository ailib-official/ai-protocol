# Getting Started with AI-Protocol

**Version**: v0.4.0 | **Last Updated**: 2026-02-05

---

## Table of Contents

1. [What is AI-Protocol?](#what-is-ai-protocol)
2. [Quick Start](#quick-start)
3. [Installation](#installation)
4. [Core Concepts](#core-concepts)
5. [Using with Runtimes](#using-with-runtimes)
6. [Configuration](#configuration)
7. [Advanced Topics](#advanced-topics)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## What is AI-Protocol?

AI-Protocol is a **provider-agnostic specification** that standardizes how you interact with AI models across different providers. It decouples the "data-state rulebook" from the "language-state runtime," providing unified infrastructure for the AI ecosystem.

### Key Principles

- **All logic is operators, all configuration is protocol** - No hardcoded provider logic in runtimes
- **Provider-agnostic** - Switch between OpenAI, Anthropic, Gemini, DeepSeek, and 30+ providers without code changes
- **Runtime-first** - Designed for automatic consumption by AI runtimes with hot-reload support
- **Schema-verifiable** - All configurations validated by JSON Schema for correctness
- **Modular** - Each provider configuration is maintained independently

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI-Protocol (Specification)                   │
│  v1/providers/ │ v1/models/ │ schemas/ │ v2-alpha/           │
│  30+ Provider manifests │ Model registry │ JSON Schema         │
└──────────────────────┴────────────────┴──────────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              ▼                               ▼
      ┌──────────────┐              ┌──────────────┐
      │ ai-lib-rust  │              │ai-lib-python │
      │  (Rust)      │              │  (Python)     │
      └──────────────┘              └──────────────┘
```

---

## Quick Start

### Using with Python

```bash
# Install the Python runtime
pip install ai-lib-python

# Set your API key
export ANTHROPIC_API_KEY="sk-ant-..."
# Or: export OPENAI_API_KEY="sk-..."
```

```python
import asyncio
from ai_lib_python import AiClient

async def main():
    # Create client - provider/model string automatically loads protocol
    client = await AiClient.create("anthropic/claude-3-5-sonnet")

    # Chat completion
    response = await client.chat().user("Hello! What's 2+2?").execute()
    print(response.content)

    await client.close()

asyncio.run(main())
```

### Using with Rust

```bash
# Create a new Rust project
cargo new my_ai_app
cd my_ai_app

# Add ai-lib-rust to Cargo.toml
echo 'ai-lib-rust = "0.6.5"' >> Cargo.toml
```

```rust
use ai_lib_rust::{AiClient, Message};

#[tokio::main]
async fn main() -> ai_lib_rust::Result<()> {
    // Create client - provider/model string automatically loads protocol
    let client = AiClient::new("anthropic/claude-3-5-sonnet").await?;

    // Chat completion
    let messages = vec![Message::user("Hello! What's 2+2?")];
    let response = client.chat().messages(messages).execute().await?;

    println!("{}", response.content);

    Ok(())
}
```

---

## Installation

### Option 1: As a Dependency (Recommended)

If you're building an application, use the official runtimes as dependencies.

**Python:**
```bash
pip install ai-lib-python
# Or with all features:
pip install ai-lib-python[full]
```

**Rust:**
```toml
[dependencies]
ai-lib-rust = "0.6"
tokio = { version = "1.0", features = ["full"] }
```

### Option 2: Clone the Specification

If you want to contribute, test multiple runtimes, or use custom protocol configurations:

```bash
# Clone the repository
git clone https://github.com/hiddenpath/ai-protocol.git
cd ai-protocol

# Validate configuration files (requires Node.js 18+)
npm install
npm run validate

# Build distribution artifacts (optional)
npm run build
```

### Option 3: Direct Integration

Some runtimes can load protocols directly from GitHub without cloning:

```python
from ai_lib_python import AiClient
loader = ProtocolLoader(base_path="https://raw.githubusercontent.com/hiddenpath/ai-protocol/main")
```

---

## Core Concepts

### Provider Manifests

Each AI provider has a **manifest file** (YAML) in `v1/providers/` that describes:

- **API endpoints** - Base URL, authentication
- **Streaming format** - SSE, NDJSON, etc.
- **Event mapping** - How to parse provider-specific responses into unified events
- **Error classification** - How to map provider errors to standard error types
- **Capabilities** - Features supported (vision, tools, streaming, etc.)

Example (Anthropic):
```yaml
# v1/providers/anthropic.yaml
id: anthropic
protocol_version: "1.5"

endpoint:
  base_url: "https://api.anthropic.com/v1"
  protocol: "https"

auth:
  type: bearer
  token_env: "ANTHROPIC_API_KEY"

streaming:
  decoder:
    format: "anthropic_sse"
    strategy: "anthropic_event_stream"

  event_map:
    - match: "$.type == 'content_block_delta' && $.delta.type == 'text_delta'"
      emit: "PartialContentDelta"
      extract:
        content: "$.delta.text"

capabilities:
  vision: true
  tools: true
  streaming: true
```

### Model Registry

Models are registered in `v1/models/`, referencing their provider:

```yaml
# v1/models/claude.yaml
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

### Standard Schema

AI-Protocol defines a **standard schema** for common parameters and events, ensuring consistency across providers:

**Standard Parameters**:
- `temperature` (0.0-2.0) - Controls randomness
- `max_tokens` (1-32768) - Maximum tokens to generate
- `top_p` (0.0-1.0) - Nucleus sampling
- `stream` (boolean) - Enable streaming
- `tools` - Tool definitions for function calling
- And more...

**Standard Events** (streaming):
- `PartialContentDelta` - Text fragments
- `ToolCallStarted` - Tool invocation begins
- `ToolCallDelta` - Tool argument streaming
- `StreamEnd` - Response complete

### Protocol Versioning

AI-Protocol uses **layered versioning**:

1. **Specification version** (in `spec.yaml`) - Defines schema structure
2. **Protocol version** (in provider manifests) - Indicates protocol features used
3. **Release version** (in `package.json`) - SemVer for the specification release

Example:
```yaml
# In provider manifest
protocol_version: "1.5"  # This provider uses protocol v1.5 features

# In spec.yaml
version: "1.1"  # This defines the v1.1 schema structure
```

---

## Using with Runtimes

### Python Runtime Quick Reference

```python
from ai_lib_python import AiClient, Message, ToolDefinition

# Create client
client = await AiClient.create("openai/gpt-4o")

# Simple chat
response = await client.chat().user("Hello!").execute()

# Streaming
async for event in client.chat().user("Tell me about AI").stream():
    if event.is_content_delta:
        print(event.as_content_delta.content, end="")

# Tool calling
def get_weather(location: str) -> dict:
    return {"temp": 20, "location": location}

weather_tool = ToolDefinition.from_function(get_weather)
response = await client.chat().user("What's the weather in Tokyo?").tools([weather_tool]).execute()

# With messages list
messages = [
    Message.system("You are a helpful assistant"),
    Message.user("Explain quantum computing")
]
response = await client.chat().messages(messages).temperature(0.7).max_tokens(1024).execute()

await client.close()
```

### Rust Runtime Quick Reference

```rust
use ai_lib_rust::{AiClient, Message};
use ai_lib_rust::types::events::StreamingEvent;
use futures::StreamExt;

// Create client
let client = AiClient::new("openai/gpt-4o").await?;

// Simple chat
let messages = vec![Message::user("Hello!")];
let response = client.chat().messages(messages).execute().await?;

// Streaming
let mut stream = client.chat().messages(vec![Message::user("Tell me about AI")])
    .stream()
    .execute_stream()
    .await?;

while let Some(event) = stream.next().await {
    match event? {
        StreamingEvent::PartialContentDelta { content, .. } => print!("{content}"),
        StreamingEvent::StreamEnd { .. } => break,
        _ => {}
    }
}

Ok(())
```

---

## Configuration

### Protocol Resolution Order

Runtimes automatically search for protocol files in this order:

1. **Custom path** (if set via `ProtocolLoader::with_base_path()`)
2. **Environment variable**: `AI_PROTOCOL_DIR` or `AI_PROTOCOL_PATH`
3. **Relative paths**: `ai-protocol/`, `../ai-protocol/`, `../../ai-protocol/`
4. **Fallback**: GitHub (`https://raw.githubusercontent.com/hiddenpath/ai-protocol/main`)

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AI_PROTOCOL_DIR` | Custom protocol directory path | `/path/to/ai-protocol` |
| `AI_PROTOCOL_PATH` | URL for remote protocol | `https://raw.githubusercontent.com/...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `GOOGLE_API_KEY` | Google AI API key | `AI...` |
| `AI_PROXY_URL` | HTTP proxy for requests | `http://user:pass@host:port` |

### Hot Reload

Enable hot reload to automatically pick up protocol changes:

```python
# Python
loader = ProtocolLoader(hot_reload=True)
provider = loader.load_provider("openai")
```

```rust
// Rust
let loader = ProtocolLoader::new().with_hot_reload(true);
let provider = loader.load_provider("openai").await?;
```

---

## Advanced Topics

### Custom Protocol Path

```python
from ai_lib_python import AiClient, ProtocolLoader
from pathlib import Path

# Load from custom directory
loader = ProtocolLoader(base_path=Path("~/my-protocols"))
manifest = loader.load_provider("my-custom-provider")

# Create client with custom manifest
client = await AiClient.builder().manifest(manifest).build()
```

### Provider-Specific Models

Some providers use custom model IDs. Reference them directly:

```python
# Use full provider/model path
client = await AiClient.create("openai/gpt-4o-2024-08-06")

# Or model registry names (if registered)
client = await AiClient.create("openai/gpt-4o")  # Maps to specific version
```

### Multiple Providers

```python
# Create clients for different providers
anthropic = await AiClient.create("anthropic/claude-3-5-sonnet")
openai = await AiClient.create("openai/gpt-4o")
gemini = await AiClient.create("google/gemini-2.0-pro")

# Use the appropriate client for different tasks
creative_task = await anthropic.chat().user("Write a poem").execute()
technical_task = await openai.chat().user("Explain quantum computing").execute()
```

### Error Handling

```python
from ai_lib_python.errors import AiLibError, ProtocolError, TransportError

try:
    response = await client.chat().user("Hello").execute()
except ProtocolError as e:
    print(f"Protocol configuration error: {e}")
except TransportError as e:
    print(f"Network/API error: {e}")
except AiLibError as e:
    print(f"General error: {e}")
```

---

## Troubleshooting

### Protocol Not Found

**Problem**: `ProtocolError:.NotFound - Provider manifest not found`

**Solutions**:
1. Check provider spelling: `openai` not `OpenAI`
2. Verify `AI_PROTOCOL_DIR` environment variable
3. Check if you're using the correct protocol version
4. Try loading from GitHub URL

### API Key Issues

**Problem**: Authentication errors

**Solutions**:
1. Set the correct environment variable: `<PROVIDER>_API_KEY`
   - Anthropic: `ANTHROPIC_API_KEY`
   - OpenAI: `OPENAI_API_KEY`
   - Google: `GOOGLE_API_KEY`
2. Verify key validity and permissions in provider dashboard
3. Check for typos in environment variable name

### Version Conflicts

**Problem**: Protocol version mismatch error

**Solutions**:
1. Check `protocol_version` in provider manifest
2. Ensure runtime supports the protocol version
3. Update runtime to latest version

### Streaming Issues

**Problem**: Streaming not working, only final response received

**Solutions**:
1. Ensure `stream: true` is set in request
2. Check provider manifest `streaming` configuration
3. Verify provider supports streaming for the model used

### For More Help

- Check [GitHub Issues](https://github.com/hiddenpath/ai-protocol/issues)
- Read [CONTRIBUTING.md](CONTRIBUTING_PROVIDER.md) for provider-specific issues
- Review [docs/SPEC.md](SPEC.md) for protocol details

---

## Next Steps

### For Users

1. **Explore Providers**: Browse [v1/providers/](https://github.com/hiddenpath/ai-protocol/tree/main/v1/providers) to see all available providers
2. **Try Examples**: Check [examples/](https://github.com/hiddenpath/ai-protocol/tree/main/examples) for configuration examples
3. **Read Documentation**: See [docs/SPEC.md](SPEC.md) for complete specification

### For Developers

1. **Contribute a Provider**: Follow [CONTRIBUTING_PROVIDER.md](CONTRIBUTING_PROVIDER.md) to add support for new providers
2. **Integrate Runtime**: Read [RUNTIME_INTEGRATION.md](RUNTIME_INTEGRATION.md) to implement AI Protocol in your runtime
3. **Join Community**: Join discussions on GitHub Issues or Discord

### For Business

1. **Evaluate**: Test multiple providers easily without changing code
2. **Optimize**: Use model routing features for cost/performance optimization
3. **Resilience**: Leverage built-in retry, fallback, and circuit breaker patterns

---

## Additional Resources

- [Official Documentation](https://github.com/hiddenpath/ai-protocol)
- [Python Runtime](https://github.com/hiddenpath/ai-lib-python)
- [Rust Runtime](https://github.com/hiddenpath/ai-lib-rust)
- [Specification](docs/SPEC.md)
- [Provider Manifests](v1/providers/)
- [Model Registry](v1/models/)

---

**Last Updated**: 2026-02-05 | **Version**: v0.4.0
