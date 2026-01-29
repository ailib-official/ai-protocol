## Fact checking model registry

AI-Protocol uses JSON Schema validation (`npm run validate`) to guarantee **structure**.
Model ids are real-world strings owned by upstream providers and may drift over time.
This document describes how we keep the registry aligned with reality in a **sustainable, open-source-friendly** way.

### Sustainability: no mandatory API keys

For a public open-source registry, **requiring API keys to validate entries would be an unnecessary burden** and would not scale. Our approach:

1. **Primary verification: public API reference / documentation**  
   Entries can be marked `verified` when they are cross-checked against **official public docs** (e.g. provider’s “Models” or “API Reference” page).  
   Set `verification.source` to the **official documentation URL** and `verification.status: verified`. No API key is required.

2. **Optional runtime verification**  
   The script `scripts/fact-check-models.js` is an **optional runtime tool**: it calls providers’ `list_models` (or equivalent) when you have an API key.  
   Use it locally if you have keys; CI runs it only when the corresponding secrets exist. The registry does **not** depend on it to be valid.

3. **Unverified when neither applies**  
   If there is no reliable public doc and no `list_models` (or no key to run it), keep `status: unverified` and use `verification.notes` to explain why.

### What the runtime checker does

For each provider that declares:

- `endpoint.base_url`
- `services.list_models.path`

the script calls the upstream list endpoint and compares results to the registry:

- `v1/models/*.yaml` → `models.*.provider`
- `v1/models/*.yaml` → `models.*.model_id`

**This is optional.** The registry is valid and usable without ever running this script.

### How to run the runtime checker (optional)

Install dependencies:

```bash
npm install
```

**Best-effort mode** (CI-safe; no secrets required):

- If a provider API key is missing, that provider is **skipped** (not failed).

```bash
npm run fact-check:models
```

**Strict mode** (for local use when you have keys):

- Missing keys are treated as errors.
- Any mismatch or upstream error fails with exit code 1.

```bash
npm run fact-check:models:strict
```

Limit to a subset of providers:

```bash
node scripts/fact-check-models.js --providers groq,openai,mistral --strict
```

### Optional environment variables (runtime verification only)

The script reads provider keys from `v1/providers/*.yaml` → `auth.token_env`.  
You only need these if you choose to run the runtime checker.

Examples:

- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`
- `GEMINI_API_KEY` (Gemini uses `auth.type=query_param` and `param_name=key`)

### Proxy / network

Node fetch does not automatically use OS proxy settings. If you are behind a proxy, set one of:

- `AI_PROXY_URL` (preferred in this ecosystem)
- `PROXY_URL`
- `HTTPS_PROXY` / `HTTP_PROXY`

---

### Evidence policy (verification block)

Every model entry in `v1/models/*.yaml` MUST include a `verification` block:

```yaml
verification:
  status: verified | unverified
  verified_at: "YYYY-MM-DD"   # recommended when status=verified
  source: "..."               # official doc URL or "list_models:/models" etc.
  notes: "optional"
```

### How to interpret verification

| Status     | Meaning |
|-----------|--------|
| **verified** | Cross-checked against a reliable source. |
| **unverified** | Not yet checked, or no reliable source / no way to run the checker. |

**Source** (`verification.source`) indicates how it was verified:

- **Official documentation URL**  
  e.g. `https://platform.openai.com/docs/models`  
  → Verified against public API reference; **no API key needed**. Preferred when available.

- **Runtime list_models**  
  e.g. `list_models:/v1/models`  
  → Verified by running `fact-check-models.js` against the provider’s list endpoint (requires API key locally or in CI when that step runs).

- **Notes only**  
  When neither a doc URL nor list_models is available, use `notes` to explain (e.g. “No public list endpoint; doc does not enumerate model ids”).

This gives a clear model overview: which entries are **doc-verified**, which are **API-verified** (runtime), and which are **unverified** (with reasons in `notes`).

### Keeping the registry up to date

- Prefer **documentation-first**: add or update entries using official public docs and set `verification.source` to the doc URL.
- Optionally run `scripts/fact-check-models.js` when you have API keys to refresh **API-verified** evidence or to catch drift.
- CI may run the script only for providers whose secrets are configured; the rest of the registry does not depend on it.
