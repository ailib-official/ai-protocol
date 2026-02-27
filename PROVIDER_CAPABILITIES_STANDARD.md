# AI-Protocol Provider Capabilities 标准化文档

## 概述

本文档定义 AI-Protocol 中 provider 能力的标准化描述，包括 capabilities 字段的统一格式、能力分类和可选值标准。

**文档版本**: 1.0
**发布日期**: 2026-02-26

---

## Provider Capabilities 标准

### Capabilities 字段定义

`capabilities` 字段是一个对象，描述 provider 支持的功能特性。

```yaml
capabilities:
  streaming: boolean          # 流式输出支持
  tools: boolean              # 工具调用 / 函数调用支持
  vision: boolean             # 视觉 / 图像输入支持
  agentic: boolean            # Agent 框架支持
  reasoning: boolean          # 推理能力标识
  parallel_tools: boolean     # 并行工具调用支持
  embeddings: boolean         # 文本嵌入支持
  rerank: boolean             # 重排序支持
  image_generation: boolean   # 图像生成支持
  code_completion: boolean    # 代码补全支持
```

---

## Capabilities 详细说明

### Streaming (流式输出)

**字段**: `streaming`

**类型**: `boolean`

**描述**: Provider 是否支持流式输出（Server-Sent Events 或类似机制）。

**示例**:
```yaml
capabilities:
  streaming: true
```

---

### Tools (工具调用)

**字段**: `tools`

**类型**: `boolean`

**描述**: Provider 是否支持工具调用 / 函数调用功能，允许模型调用外部工具或 API。

**示例**:
```yaml
capabilities:
  tools: true
  parallel_tools: false  # 如果支持并行工具调用
```

**相关字段**:
- `parallel_tools`: 是否支持并行调用多个工具

---

### Vision (视觉 / 图像输入)

**字段**: `vision`

**类型**: `boolean`

**描述**: Provider 是否支持视觉 / 图像输入（多模态模型）。

**示例**:
```yaml
capabilities:
  vision: true
```

**支持图片格式的 providers**:
- OpenAI GPT-4V/4o
- Claude 3.5 Sonnet (Vision)
- Gemini Pro (Vision)
- Lepton AI

---

### Agentic (Agent 框架支持)

**字段**: `agentic`

**类型**: `boolean`

**描述**: Provider 是否支持 Agent 框架特性（如持续对话、工具链、状态保持等）。

**示例**:
```yaml
capabilities:
  agentic: true
```

**Agentic 特性包括**:
- 多轮对话状态保持
- 工具链调用
- 推理和规划
- 自适应任务执行

---

### Reasoning (推理能力)

**字段**: `reasoning`

**类型**: `boolean`

**描述**: Provider 是否支持高级推理能力（逻辑推理、数学推理、代码推理等）。

**示例**:
```yaml
capabilities:
  reasoning: true
```

---

### Parallel Tools (并行工具调用)

**字段**: `parallel_tools`

**类型**: `boolean`

**描述**: Provider 是否支持在单次请求中并行调用多个工具。

**示例**:
```yaml
capabilities:
  tools: true
  parallel_tools: true
```

**注意**: 如果 `parallel_tools` 为 true，则 `tools` 必须为 true。

---

### Embeddings (文本嵌入)

**字段**: `embeddings`

**类型**: `boolean`

**描述**: Provider 是否提供文本嵌入 / 向量化 API。

**示例**:
```yaml
capabilities:
  embeddings: true
```

**支持 embeddings 的 providers**:
- OpenAI
- Cohere
- Hugging Face
- Jina

---

### Rerank (重排序)

**字段**: `rerank`

**类型**: `boolean`

**描述**: Provider 是否提供文档重排序 API。

**示例**:
```yaml
capabilities:
  rerank: true
```

**支持 rerank 的 providers**:
- Cohere

---

### Image Generation (图像生成)

**字段**: `image_generation`

**类型**: `boolean`

**描述**: Provider 是否支持文本到图像生成。

**示例**:
```yaml
capabilities:
  image_generation: true
```

**支持图像生成的 providers**:
- Stability AI
- Replicate
- Lepton AI

---

### Code Completion (代码补全)

**字段**: `code_completion`

**类型**: `boolean`

**描述**: Provider 是否提供代码补全或代码生成专用 API。

**示例**:
```yaml
capabilities:
  code_completion: true
```

**支持代码补全的 providers**:
- Codestral (Mistral)
- GitHub Copilot API

---

## Capabilities 矩阵

| Provider | Streaming | Tools | Vision | Agentic | Reasoning | Parallel Tools | Embeddings | Rerank | Image Gen | Code |
|----------|-----------|-------|--------|---------|----------|---------------|------------|--------|-----------|------|
| OpenAI | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Anthropic | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gemini | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cohere | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Mistral | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Groq | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DeepSeek | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Qwen | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| NVIDIA | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hugging Face | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Jina | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Stability | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| AI21 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cerebras | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lepton | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Together | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Replicate | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Anyscale | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*注意: 此矩阵基于当前的 v1 provider 配置，可能需要手动更新*

---

## Capabilities 配置模板

### 最小配置（只支持 chat completion）

```yaml
capabilities:
  streaming: true
  tools: false
  vision: false
  agentic: false
  reasoning: false
  parallel_tools: false
  embeddings: false
  rerank: false
  image_generation: false
  code_completion: false
```

### 通用聊天 API 配置

```yaml
capabilities:
  streaming: true
  tools: true
  vision: false
  agentic: false
  reasoning: true
  parallel_tools: true
  embeddings: false
  rerank: false
  image_generation: false
  code_completion: false
```

### 多模态模型配置

```yaml
capabilities:
  streaming: true
  tools: true
  vision: true
  agentic: true
  reasoning: true
  parallel_tools: true
  embeddings: false
  rerank: false
  image_generation: false
  code_completion: false
```

---

## 添加新 Capabilities

如果需要添加新的 capability：

1. 更新标准，在本文档中定义新 capability
2. 更新相关 provider 配置
3. 更新 capabilities 矩阵表

**建议的新 capability**:
- `audio_input`: 音频输入支持
- `audio_output`: 音频生成支持
- `video_input`: 视频输入支持
- `file_upload`: 文件上传支持
- `web_search`: 网络搜索集成

---

## 验证 Capabilities 配置

### 检查清单

- [ ] 所有 provider 配置包含 `capabilities` 部分
- [ ] 所有字段值为 `true` 或 `false`
- [ ] `parallel_tools` 为 `true` 时，`tools` 必须为 `true`
- [ ] 值与实际 provider 功能匹配
- [ ] 文档中的 capabilities 矩阵保持最新

---

## 参考资源

- [Provider 配置示例](../v1/providers/openai.yaml)
- [Migrate to v2](./MIGRATION_GUIDE.md)
- [Retry Policy](./RETRY_POLICY_TEMPLATE.md)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-26 | 初始版本，定义 12 种标准 capabilities |

---

**文档维护**: AI-Protocol 团队
**最后一次更新**: 2026-02-26
