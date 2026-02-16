# AI-Protocol V2 迁移指南

> 本文档指导开发者从 V1 Manifest 格式迁移到 V2 三环同心圆结构。

## 一、概述

V2 引入了三环同心圆 Manifest 架构：

- **Ring 1（核心骨架）**：`id`、`protocol_version`、`endpoint`、`error_classification` — 必填
- **Ring 2（能力映射）**：`capabilities`、`streaming`、`mcp`、`computer_use`、`multimodal` — 按需填写
- **Ring 3（高级扩展）**：`api_families`、`services`、`rate_limit_headers`、`retry_policy` — 可选

## 二、V1 → V2 自动升级

运行时自动将 V1 清单提升为 V2 格式：

```
V1 flat capabilities list → CapabilitiesV2.from_legacy()
V1 endpoint fields → EndpointV2 structure
V1 error codes → 保持不变
```

**无需立即迁移**：V1 清单在 V2 运行时中仍然可用。

## 三、Manifest 结构对比

### V1 格式（扁平）

```yaml
id: my-provider
name: MyProvider
base_url: https://api.example.com
chat_completions: /v1/chat/completions
capabilities:
  - text
  - streaming
  - vision
```

### V2 格式（三环）

```yaml
id: my-provider
protocol_version: "2.0"
name: MyProvider

# Ring 1: Core Skeleton
endpoint:
  base_url: https://api.example.com
  chat: /v1/chat/completions
  auth:
    type: bearer
    header: Authorization

# Ring 2: Capability Mapping
capabilities:
  required: [text, streaming]
  optional: [vision, mcp_client]
  feature_flags:
    structured_output: true

# Ring 2: MCP (if mcp_client capability)
mcp:
  client:
    supported: true
    protocol_version: "2025-11-25"
    transports: [streamable_http, sse]

# Ring 2: Multimodal (if vision/audio/video capability)
multimodal:
  input:
    vision:
      supported: true
      formats: [jpeg, png, webp]
      encoding_methods: [base64_inline, url]
```

## 四、新增能力

V2 新增以下能力声明：

| 能力 | Feature Flag | 说明 |
|------|-------------|------|
| `mcp_client` | `mcp` | MCP 服务器连接 |
| `mcp_server` | `mcp` | 暴露为 MCP 服务器 |
| `computer_use` | `computer_use` | GUI 自动化 |
| `reasoning` | `reasoning` | 扩展思维链 |
| `image_generation` | `multimodal` | 图像生成输出 |

## 五、运行时适配

### Rust (ai-lib-rust)

```toml
[dependencies]
ai-lib-rust = { version = "0.8", features = ["mcp", "computer_use", "multimodal"] }
```

```rust
use ai_lib_rust::protocol::v2::ManifestV2;
use ai_lib_rust::drivers::create_driver;
use ai_lib_rust::mcp::McpToolBridge;

let manifest: ManifestV2 = serde_yaml::from_str(&yaml)?;
let driver = create_driver(manifest.detect_api_style(), &manifest.id, vec![]);
```

### Python (ai-lib-python)

```bash
pip install ai-lib-python[mcp,computer_use,multimodal]
```

```python
from ai_lib_python.protocol.v2 import ManifestV2
from ai_lib_python.drivers import create_driver
from ai_lib_python.mcp import McpToolBridge

manifest = ManifestV2(id="openai", protocol_version="2.0", ...)
driver = create_driver(manifest.detect_api_style(), "openai")
```

## 六、CLI 工具

使用 `ai-protocol-cli` 验证清单：

```bash
# 验证所有清单
ai-protocol-cli validate --dir ./ai-protocol

# 查看厂商能力
ai-protocol-cli info openai --dir ./ai-protocol

# 检查运行时兼容性
ai-protocol-cli check-compat ./v2/providers/openai.yaml
```

## 七、注意事项

1. `protocol_version: "2.0"` 是 V2 清单的必填字段
2. 所有 V2 新增字段均为可选（optional），有合理默认值
3. 能力声明分为 `required`（必须可用）和 `optional`（尽力提供）
4. Feature Flag 对应 Cargo features（Rust）和 pip extras（Python）
5. 建议先使用 `ai-protocol-cli check-compat` 检查清单兼容性
