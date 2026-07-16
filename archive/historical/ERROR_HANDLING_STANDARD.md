# AI-Protocol Error Handling Standardization

## 概述

本文档定义 AI-Protocol 中错误处理的标准配置，包括 HTTP 状态码错误分类标准、错误响应格式规范和最佳实践。

**文档版本**: 1.0
**发布日期**: 2026-02-26

---

## 标准 HTTP 状态码错误分类

### 错误分类映射

| HTTP 状态码 | 错误类型 | 说明 | 可重试 |
|-------------|----------|------|--------|
| 400 | `invalid_request` | 请求参数无效 | 否 |
| 401 | `authentication` | 认证失败 | 否 |
| 403 | `permission_denied` | 权限不足 | 否 |
| 404 | `not_found` | 资源未找到 | 否 |
| 408 | `timeout` | 请求超时 | 是 |
| 409 | `conflict` | 冲突（通常与状态相关） | 是 |
| 429 | `rate_limited` | 速率限制 | 是 |
| 500 | `server_error` | 服务器内部错误 | 是 |
| 502 | `server_error` | 网关错误 | 是 |
| 503 | `server_error` | 服务不可用 | 是 |
| 504 | `timeout` | 网关超时 | 是 |

---

## Provider 配置模板

### 标准 error_classification 配置

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
```

### 带 provider 特殊情况的配置

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
    - "Provider-specific notes go here"
    - "Explain any unusual behavior"
```

---

## 错误类型详细说明

### Invalid Request (400)

**HTTP 状态码**: `400`

**描述**: 请求参数无效或格式错误。

**原因**:
- 必需参数缺失
- 参数类型错误
- 参数值超出允许范围
- JSON 格式错误

**可重试**: 否

**处理建议**:
- 检查请求参数
- 查看错误消息中的详细信息
- 修正参数后重试

### Authentication Failed (401)

**HTTP 状态码**: `401`

**描述**: 认证失败，API 密钥无效或过期。

**原因**:
- API 密钥无效
- API 密钥已过期
- 使用了错误的 API 密钥

**可重试**: 否

**处理建议**:
- 验证 API 密钥是否正确
- 检查 API 密钥是否过期
- 获取新的 API 密钥

### Permission Denied (403)

**HTTP 状态码**: `403`

**描述**: 权限不足，无法访问请求的资源。

**原因**:
- API 密钥没有访问权限
- IP 地址被限制
- 模型未批准可用

**可重试**: 否

**处理建议**:
- 检查 API 密钥的访问权限
- 查看账户设置
- 联系 provider 支持

### Not Found (404)

**HTTP 状态码**: `404`

**描述**: 资源未找到。

**原因**:
- 模型 ID 不存在
- API 端点 URL 错误
- 资源已被删除

**可重试**: 否

**处理建议**:
- 检查模型 ID 是否正确
- 验证 API 端点 URL
- 查找替代资源

### Rate Limited (429)

**HTTP 状态码**: `429`

**描述**: 已超过速率限制。

**原因**:
- 每分钟请求数超出限制
- Token 使用量超出限制
- 配额已耗尽

**可重试**: 是

**处理建议**:
- 使用指数退避重试
- 检查 `retry-after` header（如果可用）
- 降低请求频率
- 考虑升级计划配额

### Server Error (500, 502, 503)

**HTTP 状态码**: `500`, `502`, `503`

**描述**: 服务器端错误。

**原因**:
- 服务器内部错误
- 网关错误
- 服务暂时不可用

**可重试**: 是

**处理建议**:
- 使用指数退避重试
- 稍等片刻后重试
- 如果问题持续，联系 provider 支持

### Timeout (408, 504)

**HTTP 状态码**: `408`, `504`

**描述**: 请求超时。

**原因**:
- 请求处理时间过长
- 网络延迟
- 网关超时

**可重试**: 是

**处理建议**:
- 增加请求超时时间
- 使用指数退避重试
- 减小请求数据大小

---

## Provider 特殊情况

### OpenAI

**特殊情况**:
- `429` 状态码可能表示速率限制或配额耗尽
- 需要根据错误消息区分

**配置建议**:
```yaml
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "403": "permission_denied"
    "404": "not_found"
    "429": "rate_limited"
    "500": "server_error"
    "502": "server_error"
    "503": "server_error"
  notes:
    - "429 may also indicate quota/billing exhaustion"
    - "Check error message to distinguish between rate limit and quota"
```

### Anthropic

**特殊情况**:
- 支持 `retry-after` header (`429` 状态码)
- 扩展状态码: `408`, `409`, `529`

**配置建议**:
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
    "529": "server_error"
  notes:
    - "On 429, Anthropic returns a retry-after header (seconds)"
    - "SDKs commonly auto-retry 2 times"
```

### Gemini

**特殊情况**:
- 特殊错误状态码: `RESOURCE_EXHAUSTED`, `UNAVAILABLE`, `DEADLINE_EXCEEDED`

**配置建议**:
```yaml
error_classification:
  by_http_status:
    "400": "invalid_request"
    "401": "authentication"
    "403": "permission_denied"
    "404": "not_found"
    "429": "rate_limited"
    "500": "server_error"
    "503": "server_error"
    "504": "timeout"
  retry_on_error_status:
    - "RESOURCE_EXHAUSTED"
    - "UNAVAILABLE"
    - "DEADLINE_EXCEEDED"
  notes:
    - "GEMINI uses gRPC status codes in some cases"
```

---

## 错误响应格式

### 标准错误响应结构

```json
{
  "error": {
    "type": "error_type",
    "message": "Human-readable error message",
    "param": "parameter_name (optional)",
    "code": "error_code (optional)"
  }
}
```

### 示例

```json
{
  "error": {
    "type": "rate_limited",
    "message": "Rate limit exceeded. Please try again later.",
    "code": "rate_limit_exceeded"
  }
}
```

---

## 最佳实践

### 1. 统一错误类型命名

使用标准化的错误类型名称:
- `invalid_request`
- `authentication`
- `permission_denied`
- `not_found`
- `timeout`
- `conflict`
- `rate_limited`
- `server_error`

### 2. 提供详细错误信息

在 `error_classification.notes` 中说明:
- Provider 特殊行为
- 错误处理建议
- 重试策略

### 3. 根据错误类型选择重试策略

| 错误类型 | 重试策略 |
|---------|----------|
| `invalid_request` | 不重试，修正参数 |
| `authentication` | 不重试，验证密钥 |
| `permission_denied` | 不重试，检查权限 |
| `not_found` | 不重试，验证资源 |
| `timeout` | 指数退避重试 |
| `conflict` | 指数退避重试 |
| `rate_limited` | 指数退避 + 检查 retry-after |
| `server_error` | 指数退避重试 |

### 4. 记录错误日志

记录:
- 时间戳
- Provider 名称
- HTTP 状态码
- 错误类型
- 错误消息
- 请求详情（脱敏后）

---

## 实施检查清单

- [ ] 所有 provider 配置包含 `error_classification` 部分
- [ ] HTTP 状态码映射符合标准
- [ ] Provider 特殊情况已在 `notes` 中说明
- [ ] 错误响应格式统一
- [ ] 错误日志记录完整
- [ ] 重试策略与错误类型匹配

---

## 参考资源

- [HTTP Status Codes (RFC 7231)](https://tools.ietf.org/html/rfc7231#section-6)
- [Retry Policy Template](./RETRY_POLICY_TEMPLATE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-26 | 初始版本 |

---

**文档维护**: AI-Protocol 团队
**最后一次更新**: 2026-02-26
