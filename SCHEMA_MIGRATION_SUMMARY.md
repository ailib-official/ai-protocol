# Schema 验证迁移总结

**日期**: 2026-01-06  
**变更类型**: Schema 验证标准化

---

## 变更概述

将 AI-Protocol 的 schema 验证从本地相对路径迁移到 GitHub 标准 URL，确保所有运行时使用唯一的验证标准。

## 变更内容

### 1. Schema 文件更新

**文件**: `schemas/v1.json`

- ✅ 更新 `$id` 为 GitHub URL: `https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json`
- ✅ 更新 `$schema` 字段验证规则，允许 GitHub URL 和相对路径（向后兼容）

### 2. 协议文件更新

**所有 provider 和 model 文件** (12 个文件):

- ✅ `v1/providers/openai.yaml`
- ✅ `v1/providers/anthropic.yaml`
- ✅ `v1/providers/gemini.yaml`
- ✅ `v1/providers/deepseek.yaml`
- ✅ `v1/providers/groq.yaml`
- ✅ `v1/providers/qwen.yaml`
- ✅ `v1/models/gpt.yaml`
- ✅ `v1/models/claude.yaml`
- ✅ `v1/models/gemini.yaml`
- ✅ `v1/models/deepseek-chat.yaml`
- ✅ `v1/models/llama.yaml`
- ✅ `v1/models/qwen.yaml`

**变更**: 所有文件的 `$schema` 字段从相对路径 `../schemas/v1.json` 更新为 GitHub URL。

### 3. ai-lib-rust 运行时更新

**文件**: `src/protocol/validator.rs`

- ✅ 添加 `SCHEMA_GITHUB_URL` 常量（标准来源）
- ✅ 实现优先从 GitHub 加载 schema 的逻辑
- ✅ 保留本地文件 fallback（支持离线开发）
- ✅ 添加详细的错误处理和文档

## 标准 Schema URL

```
https://raw.githubusercontent.com/hiddenpath/ai-protocol/main/schemas/v1.json
```

## 验证策略

### ai-lib-rust 加载顺序

1. **优先**: 从 GitHub URL 加载（标准来源）
2. **Fallback**: 从本地文件系统加载（离线开发）

### 向后兼容性

- ✅ Schema 文件仍然支持相对路径（用于本地开发）
- ✅ 运行时支持本地文件 fallback
- ✅ 现有协议文件可以继续使用相对路径（但不推荐）

## 优势

1. **单一真实来源**: GitHub 是唯一的 schema 来源，避免版本不一致
2. **自动更新**: 运行时自动获取最新 schema，无需手动更新
3. **标准化**: 所有运行时使用相同的验证标准
4. **版本控制**: 通过 Git 标签支持固定版本
5. **CI/CD 集成**: 所有变更都经过 GitHub Actions 验证

## 发布流程

### Schema 变更流程

1. **在 ai-protocol 仓库中修改**:
   - 修改 `schemas/v1.json`
   - 提交 PR 并经过审查

2. **发布到 GitHub**:
   - PR 合并到 `main` 分支后，schema 自动在 GitHub 上可用

3. **运行时自动获取**:
   - `ai-lib-rust` 和其他运行时会在下次启动时自动获取最新 schema
   - 无需手动更新运行时代码

### 版本管理

- **main 分支**: 最新稳定版本（生产使用）
- **版本标签**: 如需要固定版本，可以使用 tag URL

## 测试验证

### 验证工具

```bash
# 使用 ai-lib-rust 的验证工具
cd ai-lib-rust
cargo run --bin validate_protocols
```

### CI 验证

- GitHub Actions 会自动验证所有协议文件
- 确保所有文件引用正确的 schema URL

## 文档

- ✅ `SCHEMA_VALIDATION.md` - Schema 验证标准文档
- ✅ `ai-lib-rust/docs/SCHEMA_VALIDATION.md` - 运行时实现说明

## 注意事项

- ⚠️ **网络依赖**: 生产环境需要网络访问 GitHub（或使用本地缓存）
- ⚠️ **向后兼容**: 现有代码仍然支持相对路径，但新文件应使用 GitHub URL
- ⚠️ **错误处理**: 如果 GitHub 不可用且无本地文件，验证会失败（这是预期的，确保使用标准 schema）

## 后续优化

1. **缓存策略**: 考虑添加 schema 缓存以减少网络请求
2. **版本固定**: 支持通过环境变量指定 schema 版本
3. **离线模式**: 改进离线模式的错误提示

---

**变更完成时间**: 2026-01-06  
**影响范围**: 所有协议文件和运行时验证逻辑  
**向后兼容**: ✅ 是（支持相对路径 fallback）
