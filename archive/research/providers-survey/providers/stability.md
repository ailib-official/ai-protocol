# Provider Survey: Stability AI (Draft)

## Provider
- **id**: stability
- **Status**: draft
- **Protocol target**: v1.x (stable)

## Current ai-protocol config snapshot
- `v1/providers/stability.yaml` 已包含：
  - 多种creative AI模式 (text_to_image/image_to_image/video_generation)
  - async作业机制
  - streaming decoder (stability_async格式)
  - retry策略 (resource-intensive generation处理)

## Official Docs (Sources)

> Stability AI提供Stable Diffusion等图像、视频、3D生成API。

- **Official Website**: `https://stability.ai`
- **API Documentation**: `https://platform.stability.ai/docs`
- **Models**: SD3, SDXL, Stable Video, Stable Audio

## Feature Summary
- 文本到图像生成 (SD3, SDXL)
- 图像编辑 (inpainting, outpainting, editing)
- 图像放大 (upscaling)
- 视频生成 (Stable Video Diffusion)
- 3D资产生成

## Notes
专注于生成式AI,与传统LLM provider不同。配置已按API规范设置,需要更多端到端测试验证。

---

**Status**: Draft
**Next Steps**: 等待API访问权限进行测试
