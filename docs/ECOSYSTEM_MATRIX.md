# Ecosystem Feature Matrix

> AI-Protocol runtime feature flags and capability alignment across Rust and Python.

## ai-lib-rust Feature Flags

| Feature | Cargo | Description |
|---------|-------|-------------|
| embeddings | `embeddings` | Embedding generation |
| batch | `batch` | Batch API processing |
| guardrails | `guardrails` | Input/output validation |
| tokens | `tokens` | Token counting, cost estimation |
| telemetry | `telemetry` | Advanced observability sinks |
| mcp | `mcp` | MCP tool bridge |
| computer_use | `computer_use` | Computer Use abstraction |
| multimodal | `multimodal` | Extended multimodal (vision/audio/video) |
| reasoning | `reasoning` | Extended thinking support |
| stt | `stt` | Speech-to-Text |
| tts | `tts` | Text-to-Speech |
| reranking | `reranking` | Document reranking |
| routing_mvp | `routing_mvp` | Model selection, load balancing |
| interceptors | `interceptors` | Call hooks |
| full | `full` | All capability + infrastructure features |

## ai-lib-python Optional Dependencies

| Feature | Extra | Description |
|---------|-------|-------------|
| vision | `vision` | Image input (pillow) |
| audio | `audio` | Audio input (soundfile) |
| embeddings | `embeddings` | Embedding generation |
| structured | `structured` | Structured output |
| batch | `batch` | Batch processing |
| agentic | `agentic` | Agentic workflows |
| telemetry | `telemetry` | OpenTelemetry |
| tokenizer | `tokenizer` | tiktoken |
| mcp | `mcp` | MCP tool bridge |
| computer_use | `computer_use` | Computer Use |
| multimodal | `multimodal` | Extended multimodal |
| reasoning | `reasoning` | Extended thinking |
| stt | `stt` | Speech-to-Text |
| tts | `tts` | Text-to-Speech |
| reranking | `reranking` | Document reranking |
| full | `full` | All extras |

## V2 Capability Mapping

| V2 Capability | Rust | Python |
|---------------|------|--------|
| text | default | default |
| streaming | default | default |
| tools | default | default |
| vision | multimodal | vision / multimodal |
| audio | multimodal | audio / multimodal |
| mcp_client | mcp | mcp |
| computer_use | computer_use | computer_use |
| embeddings | embeddings | embeddings |
| structured_output | default | structured |
| batch | batch | batch |
