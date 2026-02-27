# AI-Protocol Retry Policy 标准模板

## 概述

本文档提供标准的 retry policy 配置模板，供所有 provider 配置使用。

**文档版本**: 1.0
**发布日期**: 2026-02-26
**标准版本**: v1.0

---

## 标准 1: 通用 Retry Policy（推荐）

这是最通用的重试策略配置，适用于大多数文本生成 API。

### 配置

```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"
  retry_on_http_status: [429, 500, 502, 503]
```

### 使用场景

- 大多数文本生成 providers
- 通用 API 网关
- 新添加的 provider（如未明确指定特殊需求）

### 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| strategy | "exponential_backoff" | 指数退避策略，每次重试延迟翻倍 |
| max_retries | 3 | 最多重试 3 次 |
| min_delay_ms | 1000 | 初始延迟 1 秒 |
| max_delay_ms | 30000 | 最大延迟 30 秒 |
| jitter | "full" | 完全抖动，避免重试峰值 |
| retry_on_http_status | [429, 500, 502, 503] | 遇到这些状态码时重试 |

### HTTP 状态码说明

| 状态码 | 含义 | 重试行为 |
|--------|------|----------|
| 429 | Too Many Requests | Rate limit，指数退避重试 |
| 500 | Internal Server Error | 服务器错误，短暂等待后重试 |
| 502 | Bad Gateway | 网关错误，指数退避重试 |
| 503 | Service Unavailable | 服务暂时不可用，指数退避重试 |

---

## 标准 2: 保守 Retry Policy

适用于对失败容忍度较低、成本敏感或需要严格控制请求场景。

### 配置

```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 2
  min_delay_ms: 1000
  max_delay_ms: 60000
  jitter: "full"
  retry_on_http_status: [429, 500]
  notes:
    - "保守重试策略，减少重试次数"
    - "增加最大延迟以应对较长的恢复时间"
```

### 使用场景

- 对失败容忍度较低的应用
- 成本敏感的场景
- 需要严格控制 API 调用的场景
- **Anthropic** (provider 特定限制)

### 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| max_retries | 2 | 最多重试 2 次（比标准少） |
| max_delay_ms | 60000 | 最大延迟 60 秒（比标准长） |
| retry_on_http_status | [429, 500] | 仅重试 rate limit 和服务器错误 |

---

## 标准 3: 宽松 Retry Policy

适用于对可用性要求极高、长期运行后台任务或需要最大成功率的场景。

### 配置

```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 60000
  jitter: "full"
  retry_on_http_status: [408, 409, 429, 500, 502, 503, 504, 529]
  retry_on_error_status:
    - "RESOURCE_EXHAUSTED"
    - "UNAVAILABLE"
    - "DEADLINE_EXCEEDED"
  notes:
    - "宽松重试策略，最大成功率"
    - "重试更多种类的错误"
```

### 使用场景

- 对可用性要求极高的应用
- 长期运行的后台任务
- 需要最大成功率的场景
- **Gemini** (provider 特定错误状态码)

### 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| max_retries | 3 | 最多重试 3 次 |
| max_delay_ms | 60000 | 最大延迟 60 秒 |
| retry_on_http_status | [408, 409, 429, 500, 502, 503, 504, 529] | 重试更多状态码 |
| retry_on_error_status | [ERROR_CODES] | 重试特定的错误状态码 |

### 额外 HTTP 状态码说明

| 状态码 | 含义 |
|--------|------|
| 408 | Request Timeout |
| 409 | Conflict |
| 504 | Gateway Timeout |
| 529 | Unknown (often used by proxies) |

---

## Provider 特殊配置

### Anthropic

**配置选择**: 标准 2 (保守)

**原因**:
- Anthropic 有明确的 `max_retries: 2` 建议
- 支持 `retry-after` header
- 扩展状态码: `408, 409, 529`

**配置示例**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 2
  min_delay_ms: 1000
  max_delay_ms: 60000
  jitter: "full"
  retry_on_http_status: [408, 409, 429, 500, 529]
```

### OpenAI

**配置选择**: 标准 1 (通用)

**原因**:
- 无明确限制，推荐 `max_retries: 3`
- 需要区分 quota exhausted 与 rate limit

**配置示例**:
```yaml
retry_policy:
  strategy: "exponential_backoff"
  max_retries: 3
  min_delay_ms: 1000
  max_delay_ms: 30000
  jitter: "full"
  retry_on_http_status: [429, 500, 502, 503]
```

### Gemini

**配置选择**: 标准 3 (宽松)

**原因**:
- 特殊错误状态码: `RESOURCE_EXHAUSTED`, `UNAVAILABLE`, `DEADLINE_EXCEEDED`
- 包含 `504` 状态码

**配置示例**:
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

## 如何选择 Retry Policy

### 决策树

```
开始
  │
  ├─ Provider 有特殊要求？
  │   ├─ 是 → 使用 Provider 特殊配置
  │   └─ 否 ↓
  │
  ├─ 对成本敏感？
  │   ├─ 是 → 使用标准 2 (保守)
  │   └─ 否 ↓
  │
  ├─ 需要最大可用性？
  │   ├─ 是 → 使用标准 3 (宽松)
  │   └─ 否 ↓
  │
  └─ 使用标准 1 (通用)
```

### 选择指南

| 场景 | 推荐策略 | 原 因 |
|------|----------|--------|
| 新 provider（无特殊要求） | 标准 1 | 平衡性能和成本 |
| 通用文本 API | 标准 1 | 兼容性最好 |
| 严格成本控制 | 标准 2 | 减少重试次数 |
| 高可用性要求 | 标准 3 | 最大化成功率 |
| 批量处理任务 | 标准 1 或 3 | 根据可用性需求 |
| 实时响应 | 标准 2 | 避免累积延迟 |

---

## 实施指南

### 新 Provider 添加

1. **检查 provider 文档**: 确认是否有特殊的重试要求
2. **选择合适标准**: 根据本文档选择标准模板
3. **复制配置**: 将选定的配置复制到 provider YAML 文件
4. **添加 notes**: 如有 provider 特殊需求，添加说明注释

### 现有 Provider 更新

1. **评估现有配置**: 对比现有配置与标准模板
2. **选择更新策略**:
   - 如果配置合理，保留现有配置（记录到 notes）
   - 如果配置不足，升级到标准配置
3. **测试验证**: 更新后进行充分测试
4. **更新文档**: 记录配置变更原因

### 运行时覆盖

部分运行时 SDK 允许覆盖 provider 的默认 retry policy:

```javascript
const client = new AiClient({
  provider: 'openai',
  retryPolicy: {
    maxRetries: 5,  // 覆盖默认值
    maxDelayMs: 60000
  }
});
```

---

## 最佳实践

1. **监控重试指标**: 记录重试次数、成功率、延迟分布
2. **动态调整**: 根据监控数据动态调整重试策略
3. **限流保护**: 配合 rate limiting 使用，避免雪崩
4. **错误分类**: 区分可重试和不可重试错误
5. **告警机制**: 对持续重试失败的场景触发告警

---

## 常见问题

### Q1: 为什么选择 `full` jitter？

**A**: Full jitter 在指数退避的基础上增加随机性，避免多个客户端同时重试导致的 "惊群效应" (thundering herd problem)。

### Q2: 如何处理 quota exhausted (配额耗尽)？

**A**: Quota exhausted 通常不应重试。运行时应检查错误响应中的详细信息，仅在确认是 rate limit 时重试。

### Q3: max_reries 和 max_delay_ms 如何配合？

**A**: `max_retries` 控制重试总次数，`max_delay_ms` 限制最大延迟。指数退避公式为 `delay = min(min_delay * 2^retry_count, max_delay_ms)`。

### Q4: 不同 retry policy 是否会影响成本？

**A**: 是的，频繁重试会增加 API 调用次数和成本。根据业务场景选择合适的策略平衡可用性和成本。

---

## 参考资源

- [RFC 7231: HTTP Status Codes](https://tools.ietf.org/html/rfc7231#section-6)
- [Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Google Cloud Retry Strategy](https://cloud.google.com/iot/docs/how-tos/exponential-backoff)
- [Microsoft Azure Retry Guidance](https://docs.microsoft.com/en-us/azure/architecture/patterns/retry)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-26 | 初始版本 |

---

**文档维护**: AI-Protocol 团队
**最后一次更新**: 2026-02-26
