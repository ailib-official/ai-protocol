# PT-ME-002 — One-shot models.dev candidate pipeline

> **Advisory helper only.** models.dev is **not** SoT (ME-001 / [ARCH-005](./MANIFEST_AUTHORITY.md)).  
> Human verification required before any manifest merge. **No cron. No product runtime fetch. No `dist/` writes.**

## Purpose

Offline map from a **local** models.dev-style `api.json` dump → candidate `metadata.models` fragments
(Experimental P0/P1 fields from [MODEL_CAPABILITY_METADATA.md](./MODEL_CAPABILITY_METADATA.md)).

## Usage

```bash
# Fixture dry-run (checked in)
node scripts/me001-oneshot-candidate.js \
  --input scripts/fixtures/me001-oneshot-snippet.json \
  --providers zhipu,openai \
  --compare-v2

# Against your local dump (download once yourself; do not commit the full dump)
node scripts/me001-oneshot-candidate.js \
  --input /path/to/api.json \
  --compare-v2 \
  --out /tmp/me001-candidate-report.md \
  --json /tmp/me001-candidate.json

# Optional advisory YAML fragments (never under dist/)
node scripts/me001-oneshot-candidate.js \
  --input /path/to/api.json \
  --write-candidates /tmp/me001-candidates/
```

Default `--providers` allowlist = every v2 `category: ai_provider` id under `v2/providers/`.

## Field mapping (P0 / P1)

| models.dev | Candidate |
|------------|-----------|
| `tool_call` / `structured_output` / `reasoning` / `attachment` | `model_capabilities.*` (omit if absent) |
| `modalities.input/output` | filtered to `text\|image\|audio\|video\|pdf` |
| `reasoning_options` | `reasoning_options` (P1) |
| `family` / `knowledge` / `open_weights` | `family` / `knowledge_cutoff` / `open_weights` |
| `limit.context` / `limit.output` | `context_window` / `max_output_tokens` |
| `cost.*` | `pricing.*_per_1m` hints |

`verification.source` stays in the existing enum (`provider_catalog` + notes) — **no** `models_dev` value.

## Provider id aliases

Examples: `zhipuai`→`zhipu`, `google`→`gemini`, `moonshotai`→`moonshot`, `x-ai`→`xai`,
`baichuan-ai`→`baichuan`, `qianfan`/`ernie`→`baidu`, `volcengine`→`doubao`, `01-ai`→`yi`,
`jina-ai`→`jina`.

See `scripts/lib/me001-oneshot-map.js` (`PROVIDER_ID_ALIASES`).

### Slice routes (PT-ME-006)

Some models.dev catalogs are **plan aggregators** (mixed vendors). Whole-block alias would
pollute a first-party allowlist id. Use `PROVIDER_SLICE_ROUTES` instead — e.g. only
`hunyuan-*` / `hy*` model ids from `tencent-coding-plan` / `tencent-tokenhub` /
`tencent-token-plan` map to protocol `hunyuan`.

Reports list `meta.allowlist_unmatched` when an allowlist id still has **zero** dump coverage
after aliases+slices (often because models.dev has no first-party entry — not a missing alias).

## Tests

```bash
node --test scripts/me001-oneshot-candidate.test.js
```

## Sample report

See [`scripts/fixtures/me001-oneshot-sample-report.md`](../scripts/fixtures/me001-oneshot-sample-report.md)
(generated from the checked-in fixture).

## Non-goals

- Cron / CI mandatory sync from models.dev  
- Auto-merge into `v2/providers/*.yaml` or `dist/`  
- Expanding allowlist to aggregators (openrouter, etc.) by default  
- Runtime dependency on models.dev in products  
