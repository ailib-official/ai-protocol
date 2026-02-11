# Provider Survey: xAI (Draft)

## Provider
- **id**: xai
- **Status**: draft
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/xai.yaml` 已包含：
  - OpenAI兼容的配置结构
  - streaming decoder (SSE format)
  - event_map (PartialContentDelta, ToolCallStarted, PartialToolCall, Metadata, FinalCandidate)
  - termination 映射 (finish_reason)
  - tooling 配置 (openai_tool_calls model)
  - retry_policy (exponential_backoff)

## Official Docs (Sources)

> xAI API文档基于Elon Musk团队开发,提供Grok系列模型的API访问。

- **Official Website**: `https://x.ai`
- **API Documentation**: `https://docs.x.ai`
- **Models**: Grok-1, Grok-1.5, Grok-1.5V

TODO（建议后续补充的官方入口）：
- API Keys: `https://console.x.ai/api-keys`
- API Reference: `https://docs.x.ai/api-reference`
- Rate Limits: `https://docs.x.ai/guides/rate-limits`
- Error Codes: `https://docs.x.ai/guides/error-codes`

## Extracted Rules (What the runtime MUST do)

### 1) Endpoint + Request
- **OpenAI-compatible API**: xAI API遵循OpenAI API格式
- **Request shape**:
  - chat completions: messages/model/temperature/top_p/max_tokens/stream等标准字段
  - 支持tools/tool_choice用于函数调用
- **API Key Authentication**: 使用Bearer Token认证

### 2) Response + Usage
- **usage**: 标准的usage字段(prompt_tokens/completion_tokens/total_tokens)
- **finish_reason**: 遵循OpenAI标准的finish_reason枚举(stop/length/tool_calls/content_filter)
- **模型列表**: /models端点返回可用模型列表

### 3) Streaming
- **Wire format**: SSE (Server-Sent Events)
- **frame boundary**: `\n\n`分隔符
- **data prefix**: `data:`前缀
- **done signal**: `[DONE]`标记流结束
- **delta contract**:
  - 文本: `choices[*].delta.content`
  - 工具: `choices[*].delta.tool_calls[*].function.{name,arguments}`
  - 完成: `choices[*].finish_reason`

TODO（待逐段引用官方文档以标记为 verified）：
- 具体的SSE事件格式
- usage信息的返回时机
- tool_calls增量流的确切格式

### 4) Errors + Retry
- **HTTP status codes**: 遵循标准HTTP错误码
- **retry策略**: 建议对429和500错误使用exponential backoff
- **error format**: JSON格式,包含error对象(type/message/code)

### 5) Rate limits
- **rate limit headers**: xAI可能返回速率限制头部(待官方文档确认)
- ** quota管理**: 根据账户类型有不同额度

TODO（待官方文档验证）：
- 确切的速率限制头部字段名称
- 重试建议的详细说明

### 6) Model Specifics
- **Grok系列**:
  - Grok-1: 基础版本
  - Grok-1.5: 增强版本
  - Grok-1.5V: 视觉多模态版本
- **特色功能**:
  - 大上下文窗口
  - 实时信息访问
  - 快速推理

## Mapping to ai-protocol (Proposed)

### Spec candidates (v1)
- **OpenAI compatibility layer**: 如果未来有xAI特定特性,可能需要专门的适配器
- **Model registry**: 添加Grok系列模型到v1/models/grok.yaml

### Provider YAML candidates (xai)
- 当前配置已包含完整的OpenAI兼容配置
- 可能需要添加的xAI特定字段:
  - `reasoning_effort` 参数映射(如果支持)
  - 特定的模型能力声明

### Mapping to `v1/spec.yaml` (implemented)
- **Termination reasons**:
  - xAI uses `finish_reason` (OpenAI compatible). Map to `standard_schema.streaming_events.termination_reasons`.
  - Example mapping: `stop → end_turn`, `length → max_tokens`, `tool_calls → tool_use`, `content_filter → refusal`.
- **Tool invocation model**:
  - xAI expresses tools via `tool_calls` (OpenAI compatible).
  - Normalize to `standard_schema.content_blocks.tool_use`.

### Capabilities
基于xAI的公开特性:
- `streaming`: true
- `tools`: true (支持函数调用)
- `vision`: true (Grok-1.5V支持多模态)
- `agentic`: true (支持多步推理)
- `parallel_tools`: true (OpenAI兼容)
- `reasoning`: true (Grok模型强调推理能力)

### Notes
- xAI API相对较新,文档可能持续更新
- 建议定期检查官方API文档以获取最新信息
- 当前配置基于OpenAI兼容性假设,待官方API文档验证后可能需要调整

## Related Providers
- **OpenAI**: xAI API的主要参考标准
- **DeepSeek**: 中国区域类似的高性能推理提供商
- **Gemini**: 多模态能力相近

## References
- xAI Official: `https://x.ai`
- xAI API Docs: `https://docs.x.ai`

---

**Status**: Draft - 等待官方API文档验证
**Next Steps**: 获取xAI API访问权限,进行端到端测试,验证配置准确性
