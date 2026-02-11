# Provider Survey: Hugging Face Inference API (Draft)

## Provider
- **id**: huggingface
- **Status**: draft
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/huggingface.yaml` 已包含：
  - Serverless推理配置
  - 多模式支持 (text/image/embeddings/audio)
  - connection_vars ( dynamic model_id)
  - streaming decoder (inference_api格式)
  - retry策略 (cold start处理)
  - error_classification (503特殊处理)

## Official Docs (Sources)

> Hugging Face提供100,000+开源模型的serverless推理API。

- **Official Website**: `https://huggingface.co`
- **API Documentation**: `https://huggingface.co/docs/api-inference`
- **Models Hub**: `https://huggingface.co/models`
- **Inference Guide**: `https://huggingface.co/docs/api-inference/quicktour`
- **Error Guide**: `https://huggingface.co/docs/api-inference/errors`

## Extracted Rules (What the runtime MUST do)

### 1) Endpoint + Request
- **Dynamic model selection**:
  - endpoint pattern: `https://api-inference.huggingface.co/models/{model_id}`
  - model_id通过connection_vars或路径参数指定
  - 示例: `/meta-llama/Llama-2-7b-chat-hf`
- **Request shape** (text generation):
  - inputs: 文本或messages数组
  - parameters: temperature, max_new_tokens, top_p, top_k等
- **Authentication**: Bearer Token (HUGGINGFACE_API_KEY)
- **免费tier限制**: 有速率限制和并发限制

### 2) Response + Usage
- **响应格式**:
  - 非streaming: `[{generated_text: "..."}]`
  - streaming: SSE格式的token流
- **usage**: 可选字段,付费tier提供详细信息
- **finish_reason**: 取决于具体模型,不是所有模型都支持

### 3) Streaming
- **SSE格式**:
  - 每行包含一个token对象或状态
  - token格式: `{token: {text: "...", id: ...}}`
  - 最后一行包含generated_text或finish_reason
- **冷启动处理**:
  - 首次请求可能需要等待模型加载(10-30秒)
  - 返回503状态码
  - 推荐使用exponential backoff重试

### 4) Errors + Retry
- **HTTP status codes**:
  - 400: 无效请求
  - 401: 认证失败
  - 404: 模型未找到
  - 429: 速率限制
  - 500: 服务器错误
  - 503: **模型加载中 (冷启动)**
- **retry策略**:
  - 503错误: 必须重试,使用exponential backoff
  - 429错误: 等待后重试
  - max_retries: 推荐3-5次

### 5) Model Availability
- **受支持的模型**:
  - 文本生成: Llama, Mistral, Qwen, etc.
  - 图像生成: Stable Diffusion, SDXL, etc.
  - 嵌入: BERT, E5, etc.
  - 音频: Whisper, etc.
- **私有模型**: 支持部署自定义模型
- **模型版本**: 通过model_id指定版本或分支

### 6) Rate Limits
- **免费tier**:
  - 有速率限制
  - 有并发限制
  - 可能遇到排队
- **付费tier (Inference Endpoints)**:
  - 更高的速率限制
  - 保证的并发
  - 更低的延迟

## Mapping to ai-protocol (Proposed)

### Spec candidates (v1)
- **Model selection mechanism**: 支持动态model_id传递
- **Serverless semantics**: 说明cold start行为
- **Multi-modal support**: 统一text/image/embeddings访问

### Provider YAML candidates (huggingface)
- 当前配置已包含:
  - connection_vars支持动态模型
  - 多API families (text/image/embeddings/audio)
  - 503错误特殊处理
- 可能需要添加:
  - 模型特定的参数映射
  - Inference Endpoints专用配置

### Mapping to `v1/spec.yaml` (implemented)
- **Termination reasons**:
  - Hugging Face models may or may not return `finish_reason`.
  - Map available reasons to `standard_schema.streaming_events.termination_reasons`.
- **Response format**:
  - Non-streaming: `generated_text` field
  - Streaming: token-based SSE events

### Capabilities
- `streaming`: true (支持流式输出)
- `tools`: false (serverless推理不支持tool calling,除非自定义模型)
- `vision`: true (Stable Diffusion等图像模型)
- `agentic`: false
- `parallel_tools`: false
- `reasoning`: false (取决于具体模型)

### Tool Calling Limitation
**重要**: Hugging Face serverless inference API原生不支持tool calling。

如需tool calling,需要:
1. 部署自定义模型(通过Inference Endpoints)
2. 在模型中实现tool calling逻辑
3. 修改配置以使用自定义endpoint

## Usage Examples

### Text Generation
```bash
curl https://api-inference.huggingface.co/meta-llama/Llama-2-7b-chat-hf \
  -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  -X POST \
  -d '{"inputs": "Hello, how are you?", "parameters": {"max_new_tokens": 100}}'
```

### Streaming
```bash
curl https://api-inference.huggingface.co/meta-llama/Llama-2-7b-chat-hf \
  -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  -X POST \
  -d '{"inputs": "Tell me a story", "parameters": {"stream": true}}'
```

### Image Generation
```bash
curl https://api-inference.huggingface.co/stabilityai/stable-diffusion-xl-base-1.0 \
  -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  -X POST \
  -d '{"inputs": "a cat in space"}'
```

## Related Providers
- **Together AI**: OpenAI兼容,专注开源模型推理
- **Replicate**: 类似的模型托管服务
- **Cerebras**: 快速推理服务

## Notes
- Hugging Face Inference API支持几乎所有流行的开源模型
- 免费tier适合测试和开发,生产环境建议使用Inference Endpoints
- model_id格式: `{organization}/{model-name}[:{revision}]`
- 示例: `meta-llama/Llama-2-7b-chat-hf:9350a8381b019a06e0d7c2470ce649b07d8f0d70`

## References
- Hugging Face Inference API: `https://huggingface.co/docs/api-inference`
- Models Hub: `https://huggingface.co/models`
- Pricing: `https://huggingface.co/pricing`

---

**Status**: Draft - 基于公开API文档配置
**Next Steps**: 使用真实API测试streaming和错误处理,验证503重试行为
