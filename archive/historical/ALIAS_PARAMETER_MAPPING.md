# AI-Protocol Parameter Alias Mapping

## 概述

本文档记录所有在 provider 配置中定义的参数别名及其对应的标准参数名称。别名参数在 v2 架构中被标记为 deprecated，建议使用标准参数名称。

**文档版本**: 1.0
**发布日期**: 2026-02-26

---

## 别名映射表

| Provider | 标准参数名称 | 别名参数名称 | Deprecated | 说明 |
|----------|-------------|------------|------------|------|
| Gemini | max_tokens | maxOutputTokens | ✅ 是 | Gemini 原生参数命名 |
| Gemini | top_p | topP | ✅ 是 | Gemini 原生参数命名 |
| Gemini | top_k | topK | ✅ 是 | Gemini 原生参数命名 |

---

## 详细说明

### Gemini

| 标准参数 | 别名 | 类型 | 范围 | 是否必需 |
|---------|------|------|------|---------|
| max_tokens | maxOutputTokens | integer | min: 1, max: 65536 | 是 |
| top_p | topP | float | [0.0, 1.0] | 否 |
| top_k | topK | integer | min: 0 | 否 |

#### 原因

Gemini 使用驼峰命名法 (camelCase)，而 AI-Protocol 标准使用下划线命名法 (snake_case)。

#### 使用示例

**已废弃 (不推荐)**:
```javascript
{
  maxOutputTokens: 1000,
  topP: 0.9,
  topK: 40
}
```

**推荐**:
```javascript
{
  max_tokens: 1000,
  top_p: 0.9,
  top_k: 40
}
```

---

## 别名参数规范

### 定义规则

在 v2-alpha provider 配置中，别名参数应使用以下格式定义:

```yaml
parameters:
  # provider 原生命名
  providerParamName: {
    type: <type>,
    alias: "standard_param_name",  # 标准参数名称
    deprecated: true,              # 标记为废弃
    required: <boolean>
  }
```

### 命名约定

**标准参数命名 (AI-Protocol)**:
- 使用 snake_case: `max_tokens`, `top_p`, `top_k`

**Provider 原生命名**:
- 保留 provider 的原始命名约定
- 例如: `maxOutputTokens`, `topP`, `topK` (camelCase - Gemini/OpenAI)
- 例如: `max_token`, `temperature` (snake_case - 其他)

---

## 迁移指南

### 代码迁移

如果您的代码使用了别名参数名称，请更新为标准参数名称:

```javascript
// 旧代码 (使用别名)
const response = await client.chat({
  messages: [{ role: 'user', content: 'Hello' }],
  maxOutputTokens: 1000,  // 别名参数
  topP: 0.9               // 别名参数
});

// 新代码 (使用标准参数)
const response = await client.chat({
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 1000,       // 标准参数
  top_p: 0.9              // 标准参数
});
```

### 配置迁移

如果您的配置文件使用了别名参数，请更新为标准参数名称:

```yaml
# 旧配置 (使用别名)
parameters:
  maxOutputTokens: 1000
  topP: 0.9

# 新配置 (使用标准参数)
parameters:
  max_tokens: 1000
  top_p: 0.9
```

---

## 运行时行为

### 别名参数处理

1. **向后兼容**: 运行时会自动将别名参数映射到标准参数
2. **警告日志**: 使用别名参数时会记录 deprecation 警告
3. **未来移除**: 别名参数将在未来版本中移除

### 警告示例

```log
[AI-Protocol Warning] Parameter "maxOutputTokens" is deprecated. Use "max_tokens" instead.
Source: gemini provider, Line: 10
```

---

## 添加新的别名参数

### 流程

1. 在 provider 配置中定义别名参数
2. 在本文档中记录新的映射关系
3. 更新相关文档和示例

### 示例

```yaml
# provider.yaml
parameters:
  providerParam: {
    type: integer,
    alias: "standard_param",
    deprecated: true,
    required: true
  }
```

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-26 | 初始版本，记录 Gemini 的 3 个别名参数 |

---

**文档维护**: AI-Protocol 团队
**最后一次更新**: 2026-02-26

---

## 参考资料

- [AI-Protocol v2-alpha 配置标准](../v2-alpha/README.md)
- [参数命名规范](./PARAMETER_NAMING_CONVENTIONS.md)
- [迁移指南](./MIGRATION_GUIDE.md)
