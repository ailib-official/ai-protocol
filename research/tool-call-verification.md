# Tool Call Verification — ai-protocol V2 Provider Manifests

> **Date**: 2026-06-26 (updated from 2026-02-16 baseline)
> **Scope**: Verify tool_calling data across all 12 V2 provider manifests
> **Status**: IN PROGRESS — partial verification, remaining work identified

---

## Verification Summary (12 providers)

| # | Provider | v2/providers/ | Model Version Current? | tool_calling Block? | Depth Research? | Status |
|---|----------|---------------|----------------------|---------------------|-----------------|--------|
| 1 | **DeepSeek** | deepseek.yaml | 🔴 NO (V3.2 → V4) | ❌ Missing | ✅ (Phase 2) | ⚠️ CRITICAL FIX NEEDED |
| 2 | **Zhipu** | zhipu.yaml | 🟡 GLM-5→5.2 | ❌ Missing | ✅ (Phase 2) | ⚠️ FIX NEEDED |
| 3 | **Anthropic** | anthropic.yaml | 🟡 4.6→4.8 | ❌ Missing | ✅ (Phase 2) | OK, minor update |
| 4 | **Google** | google.yaml | 🟡 Gemini 3→? | ❌ Missing | ✅ (Phase 2) | OK, check needed |
| 5 | **Moonshot** | moonshot.yaml | 🟡 K2.5→K2.7? | ❌ Missing | ✅ (Phase 2) | OK, check needed |
| 6 | **OpenAI** | openai.yaml | 🟡 GPT-5→5.5 | ❌ Missing | ❌ | FIX NEEDED |
| 7 | **Qwen** | qwen.yaml | 🟡 Qwen3→3.7 | ❌ Missing | ❌ | FIX NEEDED |
| 8 | **Mistral** | ❌ NOT IN V2 | N/A | N/A | ❌ | NEEDS MANIFEST |
| 9 | **Doubao** | doubao.yaml | Unknown | ❌ Missing | ❌ | Needs verification |
| 10 | **Nvidia** | nvidia.yaml | Unknown | ❌ Missing | ❌ | Needs verification |
| 11 | **Groq** | groq.yaml | Unknown | ❌ Missing | ❌ | Needs verification |
| 12 | **Cohere** | cohere.yaml | Unknown | ❌ Missing | ❌ | Needs verification |
| 13 | **Jina** | jina.yaml | N/A (rerank only) | N/A | ❌ | OK, no tool call |

**Key**: ✅ = verified correct | 🟡 = needs minor version bump | 🔴 = critically outdated

---

## 🔴 Critical Issues

### DeepSeek (deepseek.yaml)
**Severity**: CRITICAL — manifests list deprecated model names
- **Current manifest says**: Version `3.2.0`, models `deepseek-chat` / `deepseek-reasoner`, context 64K
- **Actual (2026-04-24)**: Version V4, models `deepseek-v4-pro` / `deepseek-v4-flash`, context 1M
- **Deprecation**: `deepseek-chat` and `deepseek-reasoner` RETIRED on 2026-07-24
- **Impact**: ANY code using this manifest will fail after July 2026
- **Missing**: `tool_calling` block with `native.reliability: partial`, `text_fallback: enabled`
- **Pricing**: 0.28/0.42 per 1M → 0.435/0.87 (Pro), 0.14/0.28 (Flash)

### Missing tool_calling Blocks (ALL 11)
All 11 manifests with tool_call streaming maps are missing the `tool_calling` capability block:
```yaml
tool_calling:
  native:
    reliability: "full" | "partial"  # Required for VL-TTC-001 dispatcher
  text_fallback:
    enabled: true | false
    prompt_level: "L1" | "L2" | "L3"
```
This is blocking VL-TTC-001 (dispatcher selection logic depends on `native.reliability`).

---

## 🟡 Needs Update (Version Bumps)

| Provider | Current in manifest | Latest known | Date changed |
|----------|-------------------|-------------|--------------|
| DeepSeek | V3.2 (2025-12) | V4 (2026-04) | 2026-04-24 |
| Zhipu | GLM-5 (2026-02) | GLM-5.2 (2026-05) | 2026-05 |
| Anthropic | Opus 4.6 (2026-02) | Opus 4.8 (2026-06) | 2026-06 |
| OpenAI | GPT-5 (2025-08) | GPT-5.5 (2026-06) | 2026-06 |
| Qwen | Qwen3 (2025) | Qwen3.7 (2026-06) | 2026-06 |
| Moonshot | K2.5 (2026-01) | K2.7? (need verify) | Unknown |

---

## ❌ Needs New Manifest

| Provider | Reason | Research Available |
|----------|--------|-------------------|
| **Mistral AI** | Not in v2/providers/ | ✅ (.sisyphus + fresh research) |
| **Cohere** | Has manifest but outdated | ❌ Needs research |
| **Groq** | Has manifest but outdated | ❌ Needs research |
| **Nvidia** | Has manifest but outdated | ❌ Needs research |
| **Doubao** | Has manifest but outdated | ❌ Needs research |

---

## Already Verified (OK to Skip)

| Provider | Research | Last Verified | Notes |
|----------|----------|--------------|-------|
| **Anthropic** | ✅ Phase 2 deep research | 2026-02 | Opus 4.8 released since — needs version bump only |
| **Google** | ✅ Phase 2 deep research | 2026-02 | Gemini 3 Pro still latest? Need quick check |
| **Moonshot** | ✅ Phase 2 deep research | 2026-02 | K2.5 still latest? Need quick check |
| **Jina** | N/A | 2026-02 | Rerank-only provider, no tool call needed |

---

## Remaining Work Estimates

| Task | Effort | Priority |
|------|--------|----------|
| Fix DeepSeek manifest (V3.2 → V4) | 30 min | 🔴 P0 |
| Add `tool_calling` blocks to ALL 11 manifests | 2-3 hours | 🔴 P0 |
| Fix Zhipu manifest (GLM-5 → 5.2, +GLM-5V-Turbo, fix vision) | 30 min | 🟡 P1 |
| Version bumps for Anthropic/OpenAI/Qwen | 20 min each | 🟡 P1 |
| Create Mistral V2 manifest | 45 min | 🟡 P1 |
| Verify Moonshot K2.5 still latest | 15 min | 🟢 P2 |
| Verify Google Gemini 3 still latest | 15 min | 🟢 P2 |
| Research + update Cohere manifest | 45 min | 🟢 P2 |
| Research + update Groq manifest | 45 min | 🟢 P2 |
| Research + update Nvidia manifest | 45 min | 🟢 P2 |
| Research + update Doubao manifest | 45 min | 🟢 P2 |

**Total estimated**: ~8-10 hours for full completion

---

## tool_calling Block Template

For all manifests (except Jina), add:
```yaml
  tool_calling:
    native:
      reliability: "full"  # "full" = native is reliable; "partial" = text fallback needed
    text_fallback:
      enabled: false       # true for DeepSeek and similar
      prompt_level: "L2"   # Only used when enabled
```

### Which providers need text_fallback?
| Provider | native.reliability | Reason |
|----------|-------------------|--------|
| DeepSeek | `partial` | Known unreliable native tool calls; LLM often outputs `<shell>` instead |
| Anthropic | `full` | Battle-tested, SOTA tool calling |
| OpenAI | `full` | Battle-tested |
| Google | `full` | Good function calling support |
| Zhipu/GLM | `full` | Well-evaluated on MCP-Atlas |
| Moonshot | `full` | OpenAI-compatible, reliable |
| Qwen | `full` | Solid function calling |
| Others | `full` (default) | Until proven otherwise |

---

## Next Actions

1. **Immediate**: Fix DeepSeek manifest (deprecation deadline Jul 2026)
2. **This session**: Add `tool_calling` blocks to DeepSeek + Zhipu (critical for VL-TTC-001)
3. **Follow-up**: Add `tool_calling` blocks to remaining 9 manifests
4. **Later**: Version bumps for Anthropic/OpenAI/Qwen
5. **Later**: Create Mistral manifest
6. **Later**: Research + update Doubao/Nvidia/Groq/Cohere
