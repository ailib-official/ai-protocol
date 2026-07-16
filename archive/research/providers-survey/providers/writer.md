# Provider Survey: Writer (Draft)

## Provider
- **id**: writer
- **Status**: draft
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/writer.yaml` 已包含：
  - OpenAI兼容配置 (Palmyra模型)
  - streaming decoder (SSE格式)
  - rate limit headers
  - retry policy
  - enterprise-focused features (enterprise_compliance, factual_accuracy)

## Official Docs (Sources)

> Writer.com提供企业级AI写作和内容生成服务,使用Palmyra系列模型。

- **Official Website**: `https://writer.com`
- **API Documentation**: `https://dev.writer.com`
- **Models**: Palmyra系列

## Feature Summary
- 企业级写作助手
- 代码生成
- 合规性优化
- 事实准确性优化
- OpenAI API兼容

## Notes
专注于企业市场的provider,配置基于OpenAI兼容性标准,包含企业特有功能声明。

---

**Status**: Draft
**Next Steps**: 测试Palmyra模型API
