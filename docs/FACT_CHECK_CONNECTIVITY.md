# Manifest 事实核查（连通性测试）

基于 `ai-lib-rust` 的 `connectivity_report` 示例与厂商 API 文档对失败项做的核查与修正。

## 1. Cohere — 404 (model removed)

**现象**：`model 'command-r'` / `command-r-plus` was removed on September 15, 2025.

**事实核查**：[Cohere – An Overview of Cohere's Models](https://docs.cohere.com/docs/models)

| 状态 | Model Name | 说明 |
|------|------------|------|
| **Live** | `command-r-plus-08-2024` | 当前可用，Chat 推荐 |
| **Live** | `command-r-08-2024` | 当前可用 |
| **Live** | `command-a-03-2025` | 最新旗舰 |
| Deprecated 2025-09-15 | `command-r-plus`, `command-r`, `command-r-03-2024`, `command-r-plus-04-2024` | 已下线 |

**修正**：

- **v1/models/cohere.yaml**：将 `command-r-plus`、`command-r` 的 `status` 改为 `deprecated`，并注明 2025-09-15 下线，推荐使用 `command-r-plus-08-2024` / `command-r-08-2024`。
- **connectivity_report**：Cohere 测试模型改为 `cohere/command-r-plus-08-2024`。

## 2. NVIDIA NIM — 404 (page not found)

**现象**：`nvidia/nvidia-nemotron-4-340b-instruct` 请求返回 404 page not found。

**事实核查**：[NVIDIA NIM – LLM APIs](https://docs.api.nvidia.com/nim/reference/llm-apis)

- **URL**：`https://integrate.api.nvidia.com`
- **Endpoint**：`POST /v1/chat/completions`
- **v1/providers/nvidia.yaml**：`base_url: "https://integrate.api.nvidia.com/v1"`，`path: "/chat/completions"` — 与文档一致。
- 文档中 nvidia 区块列出的模型包括：`nvidia/llama3-chatqa-1.5-70b`、`nvidia-nemotron-4-340b-instruct`、`meta/llama3-70b` 等。

**可能原因**：部分模型 ID 或路由在服务端有变更，或需特定地域/配额。

**修正**：

- **connectivity_report**：NVIDIA 测试模型改为 `nvidia/meta/llama3-70b`（文档明确列出的 Chat 模型），请求体中的 `model` 为 `meta/llama3-70b`。
- 若仍 404，需在 [NVIDIA API Catalog](https://build.nvidia.com/explore/discover) 确认当前可用模型 ID，并同步更新 v1/models/nvidia.yaml。

## 3. MiniMax — 401 (invalid api key)

**现象**：`invalid api key (2049)`，`authorized_error`。

**事实核查**：[MiniMax ChatCompletion v2](https://platform.minimaxi.com/document/ChatCompletion%20v2)

- 401 表示认证失败，与 manifest 的 endpoint/base_url 无关。
- 需确认：环境变量 `MINIMAX_API_KEY` 与控制台一致、Key 未过期、未误用其他环境的 Key。

**修正**：无需改 manifest；检查 Key 与计费/权限即可。

## 4. OpenAI — 429 (insufficient_quota)

**现象**：`You exceeded your current quota`, `insufficient_quota`。

**事实核查**：[OpenAI Error codes](https://platform.openai.com/docs/guides/error-codes/api-errors)

- 429 + `insufficient_quota` 表示配额或账单问题，非 manifest 错误。

**修正**：无需改 manifest；检查 [OpenAI Billing](https://platform.openai.com/account/billing) 与额度即可。

---

## 核查来源

- Cohere: https://docs.cohere.com/docs/models  
- NVIDIA NIM: https://docs.api.nvidia.com/nim/reference/llm-apis  
- MiniMax: https://platform.minimaxi.com/document/ChatCompletion%20v2  
- OpenAI: https://platform.openai.com/docs/guides/error-codes/api-errors  

运行连通性测试：

```bash
cd ai-lib-rust
AI_PROTOCOL_DIR=/path/to/ai-protocol cargo run --example connectivity_report
```
