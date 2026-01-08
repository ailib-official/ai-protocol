# Schema 验证标准

## 概述

AI-Protocol 使用 GitHub 作为 schema 验证的**唯一标准来源**。所有协议文件（provider 和 model manifests）必须引用 GitHub 上的标准 schema URL，确保所有运行时使用相同的验证标准。

## Schema URL

**标准 Schema URL**:
```
https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json
```

## 协议文件引用

所有协议文件（`v1/providers/*.yaml` 和 `v1/models/*.yaml`）必须在文件开头使用标准 URL：

```yaml
$schema: "https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json"
```

## 运行时验证

### ai-lib-rust 验证策略

`ai-lib-rust` 的 `ProtocolValidator` 采用以下加载策略（按优先级）：

1. **GitHub URL（优先）**: 从标准 GitHub URL 加载 schema
   - 确保所有运行时使用相同的标准 schema
   - 适用于生产环境和 CI/CD

2. **本地文件（fallback）**: 如果 GitHub 不可用，从本地文件系统加载
   - 支持离线开发
   - 通过 `AI_PROTOCOL_DIR` 或 `AI_PROTOCOL_PATH` 环境变量指定路径

### 验证逻辑

```rust
// 优先从 GitHub 加载（标准来源）
if let Ok(content) = fetch_schema_from_github() {
    use content
} else {
    // Fallback 到本地文件（离线开发）
    load_schema_from_local()
}
```

## 发布流程规范

### Schema 变更流程

当需要修改 schema 时，必须遵循以下流程：

1. **在 ai-protocol 仓库中修改**:
   - 修改 `schemas/v1.json`
   - 更新版本号（如需要）
   - 提交 PR 并经过审查

2. **发布到 GitHub**:
   - PR 合并到 `main` 分支后，schema 自动在 GitHub 上可用
   - URL: `https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json`

3. **运行时自动获取**:
   - `ai-lib-rust` 和其他运行时会在下次启动时自动获取最新 schema
   - 无需手动更新运行时代码

### 版本管理

- **main 分支**: 最新稳定版本（生产使用）
- **版本标签**: 如需要固定版本，可以使用 tag URL:
  ```
  https://raw.githubusercontent.com/hiddenpath/ai-protocol/v1.1.0/schemas/v1.json
  ```

### 向后兼容性

- Schema 变更必须保持向后兼容（添加可选字段，不删除必需字段）
- 重大变更需要创建新版本（如 `v2.json`）

## 开发指南

### 本地开发

1. **设置本地路径**（用于离线开发）:
   ```bash
   export AI_PROTOCOL_DIR=/path/to/ai-protocol
   ```

2. **验证协议文件**:
   ```bash
   # 使用 ai-lib-rust 的验证工具
   cargo run --bin validate_protocols
   ```

3. **CI 验证**:
   - GitHub Actions 会自动验证所有协议文件
   - 确保所有文件引用正确的 schema URL

### 测试 Schema 变更

1. 在本地修改 `schemas/v1.json`
2. 运行验证工具确保所有协议文件仍然有效
3. 提交 PR 并等待 CI 通过
4. 合并后，所有运行时会自动使用新 schema

## 优势

1. **单一真实来源**: GitHub 是唯一的 schema 来源，避免版本不一致
2. **自动更新**: 运行时自动获取最新 schema，无需手动更新
3. **离线支持**: 本地开发时可以使用本地文件作为 fallback
4. **版本控制**: 通过 Git 标签支持固定版本
5. **CI/CD 集成**: 所有变更都经过 GitHub Actions 验证

## 注意事项

- ⚠️ **网络依赖**: 生产环境需要网络访问 GitHub（或使用本地缓存）
- ⚠️ **缓存策略**: 运行时可以考虑缓存 schema 以减少网络请求
- ⚠️ **错误处理**: 如果 GitHub 不可用且无本地文件，验证会失败（这是预期的，确保使用标准 schema）

---

**最后更新**: 2026-01-06  
**维护者**: AI-Protocol Team
