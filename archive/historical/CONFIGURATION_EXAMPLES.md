# AI-Protocol Provider 配置示例

## 概述

本文档提供常见 AI-Protocol provider 配置示例，包括 v1 和 v2-alpha 格式的对比、最佳实践和常见用例。

**文档版本**: 1.0
**发布日期**: 2026-02-26

---

## 基础配置示例

### v1 格式

```yaml
$schema: ../../schemas/v1.json
protocol_version: "1.5"
id: openai
name: OpenAI
status: stable
category: ai_provider
official_url: "https://openai.com"
support_contact: "https://help.openai.com"

endpoint:
  base_url: "https://api.openai.com/v1"
  protocol: https
  timeout_ms: 30000

auth:
  type: bearer
  token_env: "OPENAI_API_KEY"
  payload_format: "openai_style"

capabilities:
  streaming: true
  tools: true
  vision: false

retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"
  retry_on_http_status: [429, 500, 502, 503]

parameter_mappings:
  model: "model"
  messages: "messages"
  temperature: "temperature"
  max_tokens: "max_tokens"
  top_p: "top_p"
  stream: "stream"
```

### v2-alpha 格式

```yaml
$schema: ../../schemas/v2.json
protocol_version: "2.0"
id: openai
name: OpenAI
version: "1.0"
status: stable
category: ai_provider
official_url: "https://openai.com"
support_contact: "https://help.openai.com"

endpoint:
  base_url: "https://api.openai.com/v1"
  protocol: https
  timeout_ms: 30000

auth:
  type: bearer
  token_env: "OPENAI_API_KEY"
  payload_format: "openai_style"

capabilities:
  streaming: true
  tools: true
  vision: false
  agentic: false
  reasoning: true
  parallel_tools: true

retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"
  retry_on_http_status: [429, 500, 502, 503]

parameters:
  model:
    type: string
    required: true
  messages:
    type: array
    required: true
  temperature:
    type: float
    range: [0.0, 2.0]
    default: 1.0
  max_tokens:
    type: integer
    min: 1
    max: 128000
    required: true
  top_p:
    type: float
    range: [0.0, 1.0]
    default: 1.0
  stream:
    type: boolean
    default: false
```

---

## 不同配置风格的示例

### 保守配置（重试次数少）

**Retry Policy**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 2
  min_delay_ms: 1000
  max_delay_ms: 60000
  jitter: "full"
  retry_on_http_status: [429, 500]
```

**适用场景**:
- 成本敏感的应用
- 对失败容忍度较低的监控
- Anthropic 等有特定限制的 providers

---

### 宽松配置（重试次数多）

**Retry Policy**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 5
  min_delay_ms: 1000
  max_delay_ms: 60000
  jitter: "full"
  retry_on_http_status: [408, 409, 429, 500, 502, 503, 504, 529]
```

**适用场景**:
- 对可用性要求极高的应用
- 后台处理任务
- 需要 100% 成功率的场景

---

### 带特殊错误处理的配置

**Error Classification with Notes**:
```yaml
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "403": "permission_denied"
    "404": "not_found"
    "408": "timeout"
    "409": "conflict"
    "429": "rate_limited"
    "500": "server_error"
    "502": "server_error"
    "503": "server_error"
    "504": "timeout"
  notes:
    - "429 status code may indicate rate limit OR quota exhaustion"
    - "Check error message content to determine correct handling"
    - "Do not retry on quota exhausted errors"
```

---

### 带扩展 status code 的配置

**Gemini 风格**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"
  retry_on_http_status: [429, 503, 504]
  retry_on_error_status:
    - "RESOURCE_EXHAUSTED"
    - "UNAVAILABLE"
    - "DEADLINE_EXCEEDED"
```

---

## 特定类型 Provider 配置示例

### Embeddings Provider

```yaml
id: jina
name: Jina AI
status: stable
category: embeddings

endpoint:
  base_url: "https://api.jina.ai/v1"
  protocol: https
  timeout_ms: 30000

auth:
  type: bearer
  token_env: JINA_API_KEY

capabilities:
  streaming: false
  tools: false
  vision: true
  embeddings: true

parameter_mappings:
  model: "model"
  input: "input"
  encoding_format: "encoding_format"
  dimensions: "dimensions"
```

---

### 多模态 Provider

```yaml
id: openai
name: OpenAI
status: stable
category: multimodal

capabilities:
  streaming: true
  tools: true
  vision: true
  agentic: false
  reasoning: true
  parallel_tools: true

parameters:
  model:
    type: string
    enum: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
    required: true
  messages:
    type: array
    required: true
  temperature:
    type: float
    range: [0.0, 2.0]
    default: 1.0
  max_tokens:
    type: integer
    min: 1
    max: 64000
    required: true
```

---

### 代码补全 Provider

```yaml
id: codestral
name: Codestral
status: stable
category: code_completion

capabilities:
  streaming: true
  tools: false
  vision: false
  code_completion: true

parameter_mappings:
  model: "model"
  prompt: "prompt"
  suffix: "suffix"
  max_tokens: "max_tokens"
  temperature: "temperature"
```

---

## 配置最佳实践

### 1. 参数定义原则

**v2-alpha 参数定义**:
```yaml
parameters:
  temperature:
    type: float
    range: [0.0, 2.0]          # 统一范围
    default: 1.0              # 合理默认值
  max_tokens:
    type: integer
    min: 1
    max: 128000
    required: true            # 明确标记必需性
```

### 2. Retry Policy 一致性

使用 [Retry Policy Template](./RETRY_POLICY_TEMPLATE.md) 中定义的标准模板。

### 3. Error Handling 完整性

确保包含完整的 error_classification 映射，参考 [Error Handling Standard](./ERROR_HANDLING_STANDARD.md)。

### 4. Capabilities 准确性

根据实际 API 功能设置 capabilities：
- 只在真正支持时才标记为 `true`
- 使用 capabilities 矩阵参考其他类似 provider

### 5. Rate Limit Headers

即使 provider 不支持 rate limit 头部，也应包含空对象：
```yaml
rate_limit_headers:
  # Empty object (provider does not support rate limits)
  {}
```

---

## 配置验证

### 使用验证脚本

验证配置的正确性：
```bash
node scripts/validate_parameters.js
```

### 手动检查清单

- [ ] 所有必需字段存在
- [ ] 参数类型正确
- [ ] 参数范围合理
- [ ] retry_policy 配置完整
- [ ] error_classification 映射合理
- [ ] capabilities 与实际匹配
- [ ] YAML 格式正确
- [ ] 注释清晰有意义

---

## 常见错误示例

### 错误 1: 缺少 required 字段

**错误**:
```yaml
parameters:
  max_tokens:
    type: integer
    min: 1
    max: 128000
    # 缺少 required: true
```

**修正**:
```yaml
parameters:
  max_tokens:
    type: integer
    min: 1
    max: 128000
    required: true
```

---

### 错误 2: Temperature 范围不统一

**错误**:
```yaml
parameters:
  temperature:
    type: float
    range: [0.0, 1.0]  # 不符合标准 [0.0, 2.0]
```

**修正**:
```yaml
parameters:
  temperature:
    type: float
    range: [0.0, 2.0]  # 使用统一范围
    # 如有特殊限制，添加注释
```

---

### 错误 3: Retry Policy 缺少字段

**错误**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  缺少 max_retries 和 max_delay_ms
```

**修正**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"
  retry_on_http_status: [429, 500, 502, 503]
```

---

## 参考文档

- [Migrate to v2](./MIGRATION_GUIDE.md)
- [Retry Policy Template](./RETRY_POLICY_TEMPLATE.md)
- [Error Handling Standard](./ERROR_HANDLING_STANDARD.md)
- [Provider Capabilities Standard](./PROVIDER_CAPABILITIES_STANDARD.md)
- [Alias Parameter Mapping](./ALIAS_PARAMETER_MAPPING.md)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-26 | 初始版本 |

---

**文档维护**: AI-Protocol 团队
**最后一次更新**: 2026-02-26
