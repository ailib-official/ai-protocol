# AI-Protocol v1 到 v2-alpha 迁移指南

## 概述

本文档帮助开发者将 AI-Protocol 配置从 v1 迁移到 v2-alpha。v2-alpha 是一个全新的架构版本，提供了更一致的参数定义、更强的类型约束和更好的标准化支持。

**文档版本**: 1.0
**发布日期**: 2026-02-26
**支持版本**: v1.5 → v2-alpha

---

## 主要变更摘要

### 1. 参数定义架构变更

| 特性 | v1 | v2-alpha |
|-----|----|----------|
| 参数定义 | `parameter_mappings` (简单映射) | `parameters` (完整类型定义) |
| 类型系统 | 无类型约束 | 完整类型系统 (integer, float, string, boolean, array, object) |
| 必需性标记 | 无明确的 required 标记 | 支持 `required: true/false` |
| 参数别名 | 通过映射隐式支持 | 显式 `alias` 字段 |
| 默认值 | 部分参数支持 | 所有参数支持 `default` 字段 |
| 验证范围 | 无范围验证 | 支持 `min`/`max`/`enum` 约束 |

### 2. 核心标准化变更

| 参数 | v1 | v2-alpha | 说明 |
|------|----|----------|------|
| `temperature` | 无统一范围 | `[0.0, 2.0]` | 统一全部 providers 的范围 |
| `max_tokens` | 映射字段 | `required: true` | 明确标记为必需参数 |
| `rate_limit_headers` | 部分支持 | 标准化字段 | 所有 providers 统一结构 |

---

## 详细变更说明

### 2.1 Temperature 参数统一

**v1 示例** (不同 provider 有不同范围):
```yaml
# anthropic.yaml (v1)
temperature: "temperature"  # 实际限制 [0.0, 1.0]

# openai.yaml (v1)
temperature: "temperature"  # 实际限制 [0.0, 2.0]
```

**v2-alpha 示例** (统一范围):
```yaml
# anthropic.yaml (v2-alpha)
parameters:
  temperature:
    type: float
    range: [0.0, 2.0]
    default: 1.0
    # provider_specific_constraints:
    #   max_value_override: 1.0  # 运行时校验 Anthropic 限制
```

**迁移要点**:
- 所有 providers 的 `temperature` 范围统一为 `[0.0, 2.0]`
- 某些 providers 的实际限制通过注释或附加字段说明
- 运行时库负责验证实际 provider 特定限制

---

### 2.2 Max Tokens 必需性标记

**v1 示例**:
```yaml
# openai.yaml (v1)
parameter_mappings:
  model: "model"
  messages: "messages"
  max_tokens: "max_tokens"  # 通过映射定义，无必需性标记
```

**v2-alpha 示例**:
```yaml
# openai.yaml (v2-alpha)
parameters:
  max_tokens:
    type: integer
    min: 1
    max: 128000
    required: true  # 显式标记为必需
```

**迁移要点**:
- `max_tokens` 在所有 v2-alpha providers 中标记为 `required: true`
- 源代码需要在调用时提供 `max_tokens` 参数
- 验证工具会在启动时检查必需参数

---

### 2.3 Rate Limit Headers 标准化

**v1 示例** (provider 特定):
```yaml
# anthropic.yaml (v1)
rate_limit_headers:
  requests_limit: "anthropic-ratelimit-requests-limit"
  requests_remaining: "anthropic-ratelimit-requests-remaining"
  # ... 其他头部
```

**v2-alpha 示例** (标准化结构):
```yaml
# anthropic.yaml (v2-alpha)
rate_limit_headers:
  # Provider-specific headers (保持向后兼容)
  requests_limit: "anthropic-ratelimit-requests-limit"
  requests_remaining: "anthropic-ratelimit-requests-remaining"
  tokens_limit: "anthropic-ratelimit-tokens-limit"
  tokens_remaining: "anthropic-ratelimit-tokens-remaining"
  retry_after: "retry-after"
  # Normalized fields (运行时标准访问)
  # rate_limit_requests_limit: (自动解析并填充)
  # rate_limit_requests_remaining: (自动解析并填充)
  # rate_limit_tokens_limit: (自动解析并填充)
  # rate_limit_tokens_remaining: (自动解析并填充)
  # rate_limit_retry_after: (自动解析并填充)
```

**迁移要点**:
- 保留 provider 特定头部以保持向后兼容性
- 添加标准化注释说明运行时访问字段
- 对于不支持 rate limits 的 providers (如 Gemini)，添加空对象 `{}`

---

## 迁移步骤

### 步骤 1: 环境准备

```bash
# 1. 备份现有配置
cp -r /path/to/v1/configs /path/to/v1/configs.backup

# 2. 克隆或切换到 v2-alpha 分支
git checkout v2-alpha  # 或下载 v2-alpha 版本
```

### 步骤 2: 代码适配

**客户端代码变更示例**:

v1 调用:
```javascript
const client = new AiClient({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// max_tokens 可选
const response = await client.chat({
  messages: [{ role: 'user', content: 'Hello' }]
});
```

v2-alpha 调用:
```javascript
const client = new AiClient({
  provider: 'openai',  // 或使用 v2 目录
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// max_tokens 现在必需
const response = await client.chat({
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 1000  // 添加必需参数
});
```

### 步骤 3: 配置迁移

**Provider 配置迁移**:

如果使用自定义 provider 配置，需要将配置文件从 v1 格式转换到 v2-alpha 格式:

```yaml
# v1 格式 (deprecated)
id: my-provider
name: My Provider
parameter_mappings:
  model: "model"
  temperature: "temperature"
  max_tokens: "max_tokens"

# v2-alpha 格式 (推荐)
id: my-provider
name: My Provider
parameters:
  model:
    type: string
    required: true
  temperature:
    type: float
    range: [0.0, 2.0]
    default: 1.0
  max_tokens:
    type: integer
    min: 1
    max: 1024
    required: true
```

### 步骤 4: 验证

使用验证脚本检查配置:

```bash
# 验证 v1 配置
node scripts/validate_parameters.js

# 预期输出:
# v1 providers: 36 files, 验证通过: X/36
# v2-alpha providers: 3 files, 验证通过: 3/3 (100%)
```

---

## 升级兼容性

### 向后兼容性

✅ **保持兼容**:
- Provider ID 保持不变
- API 调用接口基本兼容
- 参数名称保持一致

⚠️ **破坏性变更**:
- `max_tokens` 现在是必需参数，所有调用必须提供
- 温度超出范围会引发运行时错误

### 迁移策略

1. **渐进式迁移**: 可以在一段时间内同时支持和调用 v1 和 v2-alpha 配置
2. **回滚机制**: 保留 v1 配置备份，在出现问题时可以快速回退
3. **监控和日志**: 在迁移期间加强日志记录，便于问题排查

---

## 常见问题

### Q1: v1 配置还能使用吗？

**A**: 是的，v1 配置仍然支持和维护。v2-alpha 是可选的演进版本，提供更严格的类型和安全保证。

### Q2: 必须立即迁移吗？

**A**: 不强制。v1 配置将继续支持。建议在新项目或重构时采用 v2-alpha。

### Q3: 如何处理自定义 provider 配置？

**A**: 参考迁移步骤 3 中的配置格式，将自定义 provider 配置转换为 v2-alpha 格式。

### Q4: max_tokens 必需性会破坏现有代码吗？

**A**: 如果现有代码不提供 `max_tokens`，需要在调用时添加该参数。可以使用合理的默认值 (如 1000 或 2048)。

### Q5: Temperature 范围统一会影响现有行为吗？

**A**: Anthropic 仍限制在 [0.0, 1.0]，超出此范围会在运行时报错。其他 providers 支持 [0.0, 2.0]。

---

## 获取帮助

- **问题反馈**: GitHub Issues
- **文档**: [AI-Protocol 官方文档](https://github.com/hiddenpath/ai-protocol)
- **示例**: 查看示例目录中的 v1 和 v2-alpha 对比

---

**文档维护**: AI-Protocol 团队
**最后一次更新**: 2026-02-26
