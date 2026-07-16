# AI-Protocol Provider 配置完成度检查清单

## 概述

本文档提供 AI-Protocol provider 配置的完整检查清单，确保所有 providers 都符合配置标准。

**文档版本**: 1.0
**发布日期**: 2026-02-26

---

## v1 Provider 配置检查清单

### 必需字段

- [ ] `$schema` 指向正确的 schema 文件（`../../schemas/v1.json`）
- [ ] `protocol_version` 设置为 `"1.5"`
- [ ] `id` 唯一标识符（小写，无空格）
- [ ] `name` Provider 显示名称
- [ ] `status` 配置状态（"stable", "beta", "draft"）
- [ ] `category` 分类（"ai_provider", "embeddings", "image_generation" 等）

### Endpoint 配置

- [ ] `endpoint` 部分存在
- [ ] `endpoint.base_url` 有效的 API 地址
- [ ] `endpoint.protocol` 设置为 "https" 或 "http"
- [ ] `endpoint.timeout_ms` 合理的超时时间（推荐 30000-60000）

### 认证配置

- [ ] `auth` 部分存在
- [ ] `auth.type` 设置为 "bearer" 或正确类型
- [ ] `auth.token_env` 环境变量名称（大写，带 _API_KEY 或 _TOKEN）
- [ ] `auth.payload_format` 格式（"openai_style", "anthropic_style" 等）

### Services 配置

- [ ] `services.list_models` 定义模型列表端点
  - [ ] `path` 路径正确
  - [ ] `method` 设置为 "GET"
  - [ ] `response_binding` 绑定到正确字段

### Capabilities 配置

- [ ] `capabilities` 部分存在
- [ ] `streaming` 正确设置（支持 SSE 则为 true）
- [ ] `tools` 正确设置（支持工具调用则为 true）
- [ ] `vision` 正确设置（支持图像输入则为 true）
- [ ] `agentic` 正确设置（支持 agent 框架则为 true）
- [ ] `reasoning` 正确设置（有推理能力则为 true）
- [ ] `parallel_tools` 如为 true，则 `tools` 必须为 true

### Streaming 配置（如支持）

- [ ] `streaming` 部分存在
- [ ] `event_format` 格式正确（"data_lines", "anthropic_events" 等）
- [ ] `decoder` 配置完整
  - [ ] `format` 格式类型（"sse", "anthropic_sse" 等）
  - [ ] `delimiter` 分隔符正确
  - [ ] `prefix` 前缀正确
  - [ ] `done_signal` 完成信号正确

### Response 配置

- [ ] `response_format` 格式类型（"openai_style", "anthropic_style" 等）
- [ ] `response_paths` 路径映射完整
  - [ ] `content` 内容路径
  - [ ] `finish_reason` 完成原因路径
  - [ ] `model` 模型路径
  - [ ] `id` 请求 ID 路径

### Retry Policy 配置

- [ ] `retry_policy` 部分存在
- [ ] `strategy` 设置为 "exponential_backoff"
- [ ] `max_retries` 设置（推荐 2 或 3）
- [ ] `min_delay_ms` 设置为 1000 或合理值
- [ ] `max_delay_ms` 设置（推荐 30000 或 60000）
- [ ] `jitter` 设置为 "full"
- [ ] `retry_on_http_status` 包含标准状态码
  - [ ] 429 (rate limit)
  - [ ] 500, 502, 503 (server errors)

### Rate Limit Headers 配置

- [ ] `rate_limit_headers` 部分存在
- [ ] 如不支持，设置为空对象 `{}`
- [ ] 如支持，包含必要的头部：
  - [ ] `requests_limit` 请求数限制
  - [ ] `requests_remaining` 剩余请求数
  - [ ] `tokens_limit` Token 限制
  - [ ] `tokens_remaining` 剩余 Token 数

### Parameter Mappings 配置

- [ ] `parameter_mappings` 部分存在
- [ ] `model` 映射存在
- [ ] `messages` 映射存在（聊天 APIs）
- [ ] `temperature` 映射存在
- [ ] `max_tokens` 或 `length` 映射存在
- [ ] `top_p` 映射存在（如支持）
- [ ] 其他参数映射正确

### Error Classification 配置

- [ ] `error_classification` 部分存在
- [ ] `by_http_status` HTTP 状态码映射完整
  - [ ] "400" -> "invalid_request" 或类似
  - [ ] "401" -> "authentication"
  - [ ] "403" -> "permission_denied"
  - [ ] "404" -> "not_found"
  - [ ] "429" -> "rate_limited"
  - [ ] "500" -> "server_error"

### Notes 配置

- [ ] `notes` 部分包含有用信息
- [ ] 特殊行为已说明
- [ ] Rate limit 信息已说明
- [ ] 其他重要信息已记录

---

## v2-alpha Provider 配置检查清单

### 必需字段

- [ ] `$schema` 指向正确的 schema 文件（`../../schemas/v2.json`）
- [ ] `protocol_version` 设置为 `"2.0"`
- [ ] `id` 唯一标识符（小写，无空格）
- [ ] `name` Provider 显示名称
- [ ] `version` 配置版本（如 "1.0"）
- [ ] `status` 配置状态（"stable", "beta", "draft"）
- [ ] `category` 分类（"ai_provider", "embeddings", "image_generation" 等）

### Endpoint 配置

（同 v1）

### 认证配置

（同 v1）

### Capabilities 配置

（同 v1，增加以下）:
- [ ] `embeddings` 嵌入支持（如提供）
- [ ] `rerank` 重排序支持（如提供）
- [ ] `image_generation` 图像生成（如提供）
- [ ] `code_completion` 代码补全（如提供）

### Streaming 配置

（同 v1）

### Response 配置

（同 v1）

### Retry Policy 配置

（同 v1）

### Rate Limit Headers 配置

（同 v1）

### Parameters 配置（v2 特有）

- [ ] `parameters` 部分存在（替代 v1 的 `parameter_mappings`）
- [ ] **model**
  - [ ] `type` 为 "string"
  - [ ] `required` 为 `true`
- [ ] **temperature**
  - [ ] `type` 为 "float"
  - [ ] `range` 为 `[0.0, 2.0]`（统一标准）
  - [ ] `default` 有合理默认值（如 1.0）
- [ ] **max_tokens**
  - [ ] `type` 为 "integer"
  - [ ] `min` 设置为 1
  - [ ] `max` 根据实际模型设置合理值
  - [ ] `required` 为 `true`
- [ ] **top_p**
  - [ ] `type` 为 "float"
  - [ ] `range` 为 `[0.0, 1.0]`
  - [ ] `default` 有合理默认值（如 1.0）

### 别名参数配置（如适用）

- [ ] 使用标准参数名称（snake_case）
- [ ] Provider 原生命名（如 maxOutputTokens）设置 `alias`
- [ ] 别名参数设置 `deprecated: true`

### Error Classification 配置

（同 v1）

### Notes 配置

（同 v1）

---

## 通用检查项

### YAML 格式

- [ ] 文件格式正确，无 YAML 语法错误
- [ ] 缩进使用 2 空格（或与项目一致）
- [ ] 引号使用一致（推荐双引号）
- [ ] 列表格式正确（`- item`）

### 命名规范

- [ ] 所有 ID 使用小写，无空格，可使用连字符
- [ ] 所有环境变量名全部大写（`OPENAI_API_KEY`）
- [ ] 注释清晰，有意义
- [ ] 无拼写错误

### 文档完整性

- [ ] 参数说明清晰
- [ ] 特殊行为有注释说明
- [ ] 限制条件已记录
- [ ] 示例代码正确

### 安全性

- [ ] 不包含硬编码的 API 密钥
- [ ] 正确使用环境变量引用
- [ ] Rate limit 配置合理
- [ ] 敏感信息未泄露

---

## 验证步骤

### 1. 语法验证

运行 YAML 验证工具：
```bash
# 使用 yamllint（如果可用）
yamllint v1/providers/{provider}.yaml

# 或使用在线 YAML 验证器
```

### 2. 配置验证

运行验证脚本：
```bash
node scripts/validate_parameters.js
```

### 3. 连接测试

测试 provider API 连接：
```bash
# 测试模型列表
curl -H "Authorization: Bearer $API_KEY" {BASE_URL}/models
```

### 4. 集成测试

运行集成测试（如存在）：
```bash
npm test -- --provider={provider_id}
```

---

## 示例：完成 v1 配置

✅ **OpenAI v1 配置** - 所有必需字段和可选字段都正确配置

示例检查结果：
```
必需字段: ✅
  - $schema: ../../schemas/v1.json ✅
  - protocol_version: "1.5" ✅
  - id: "openai" ✅
  - name: "OpenAI" ✅
  - status: "stable" ✅

Endpoint: ✅
  - base_url: "https://api.openai.com/v1" ✅
  - protocol: "https" ✅
  - timeout_ms: 30000 ✅

认证: ✅
  - type: "bearer" ✅
  - token_env: "OPENAI_API_KEY" ✅

Capabilities: ✅
  - streaming: true ✅
  - tools: true ✅

Retry Policy: ✅
  - strategy: "exponential_backoff" ✅
  - max_retries: 3 ✅
  - retry_on_http_status: [429, 500, 502, 503] ✅

Parameter Mappings: ✅
  - model, messages, temperature, max_tokens, top_p ✅

Error Classification: ✅
  - by_http_status: 400, 401, 403, 404, 429, 500 ✅

YAML 格式: ✅
  - 无语法错误 ✅
  - 缩进正确 ✅

总体评分: ✅ 完全符合标准
```

---

## 常见错误和修正

### 错误 1: Temperature 范围不统一

**错误**:
```yaml
temperature:
  range: [0.0, 1.0]  # 不是标准的 [0.0, 2.0]
```

**修正**:
```yaml
temperature:
  range: [0.0, 2.0]
  # 如有特殊限制，添加注释说明
```

---

### 错误 2: 缺少 max_tokens required 标记

**错误**:
```yaml
max_tokens:
  type: integer
  min: 1
  max: 128000
  # 缺少 required: true
```

**修正**:
```yaml
max_tokens:
  type: integer
  min: 1
  max: 128000
  required: true  # 添加必需标记
```

---

### 错误 3: Retry Policy 不完整

**错误**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  min_delay_ms: 1000
  # 缺少其他必需字段
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

## 完成度评分

| 评分 | 描述 | 条件 |
|------|------|------|
| 5 | 优秀 | 所有必需和推荐项都符合标准 |
| 4 | 良好 | 所有必需项符合，部分推荐项缺失 |
| 3 | 合格 | 所有必需项符合，推荐项大量缺失 |
| 2 | 需改进 | 部分必需项不符合标准 |
| 1 | 不合格 | 大量必需项缺失 |

---

## 文档更新维护

本检查清单应定期更新以反映：
- 新的标准和要求
- 新的字段和配置选项
- 常见错误和最佳实践

如有更新建议，请提交 GitHub Issue。

---

## 参考资源

- [Migrate to v2](./MIGRATION_GUIDE.md)
- [Retry Policy Template](./RETRY_POLICY_TEMPLATE.md)
- [Error Handling Standard](./ERROR_HANDLING_STANDARD.md)
- [Provider Capabilities Standard](./PROVIDER_CAPABILITIES_STANDARD.md)
- [Configuration Examples](./CONFIGURATION_EXAMPLES.md)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-26 | 初始版本，涵盖 v1 和 v2-alpha 配置标准 |

---

**文档维护**: AI-Protocol 团队
**最后一次更新**: 2026-02-26
