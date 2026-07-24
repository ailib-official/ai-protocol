/**
 * PT-ME-002 — pure mapping from models.dev provider/model rows → ME-001 candidate entries.
 * Advisory only; omit = unknown (never invent false for missing bools).
 */
export const MODALITY_ENUM = new Set(['text', 'image', 'audio', 'video', 'pdf']);

/** models.dev provider id → ai-protocol canonical id */
export const PROVIDER_ID_ALIASES = {
  zhipuai: 'zhipu',
  google: 'gemini',
  'google-vertex': 'gemini',
  moonshotai: 'moonshot',
  'moonshot-ai': 'moonshot',
  'x-ai': 'xai',
  xai: 'xai',
  'alibaba-cloud': 'qwen',
  alibaba: 'qwen',
  dashscope: 'qwen',
  '01-ai': 'yi',
  '01ai': 'yi',
  lingyiwanwu: 'yi',
  'baichuan-ai': 'baichuan',
  'baichuan-inc': 'baichuan',
  'perplexity-ai': 'perplexity',
  'mistral-ai': 'mistral',
  minimax: 'minimax',
  'minimax-cn': 'minimax',
};

export function resolveProviderId(modelsDevId) {
  if (!modelsDevId || typeof modelsDevId !== 'string') return null;
  const key = modelsDevId.toLowerCase();
  return PROVIDER_ID_ALIASES[key] || key;
}

export function filterModalities(list) {
  if (!Array.isArray(list)) return undefined;
  const out = [...new Set(list.filter((m) => MODALITY_ENUM.has(m)))];
  return out.length ? out : undefined;
}

/**
 * Map a single models.dev model object to an Experimental metadata.models entry (candidate).
 * Only P0/P1 fields from ME-001 / PT-ME-001.
 */
export function mapModelToCandidate(model, { verifiedAt = '2026-07-24' } = {}) {
  if (!model || typeof model !== 'object') return null;
  const id = model.id;
  if (!id || typeof id !== 'string') return null;

  const mc = {};
  if (typeof model.tool_call === 'boolean') mc.tool_call = model.tool_call;
  if (typeof model.structured_output === 'boolean') mc.structured_output = model.structured_output;
  if (typeof model.reasoning === 'boolean') mc.reasoning = model.reasoning;
  if (typeof model.attachment === 'boolean') mc.attachment = model.attachment;

  const modalities = {};
  const input = filterModalities(model.modalities?.input);
  const output = filterModalities(model.modalities?.output);
  if (input) modalities.input = input;
  if (output) modalities.output = output;

  const entry = {};
  const ctx = model.limit?.context;
  const outTok = model.limit?.output;
  if (typeof ctx === 'number' && ctx >= 0) entry.context_window = ctx;
  if (typeof outTok === 'number' && outTok >= 0) entry.max_output_tokens = outTok;
  if (typeof model.family === 'string' && model.family) entry.family = model.family;
  if (typeof model.knowledge === 'string' && model.knowledge) entry.knowledge_cutoff = model.knowledge;
  if (typeof model.open_weights === 'boolean') entry.open_weights = model.open_weights;
  if (typeof model.release_date === 'string' && model.release_date) entry.release_date = model.release_date;

  if (Object.keys(mc).length) entry.model_capabilities = mc;
  if (Object.keys(modalities).length) entry.modalities = modalities;

  if (Array.isArray(model.reasoning_options) && model.reasoning_options.length) {
    entry.reasoning_options = model.reasoning_options.map((o) => {
      if (!o || typeof o !== 'object') return { type: String(o) };
      const ro = {};
      if (typeof o.type === 'string') ro.type = o.type;
      if (Array.isArray(o.values)) ro.values = o.values.map(String);
      if (typeof o.min === 'number') ro.min = o.min;
      if (typeof o.max === 'number') ro.max = o.max;
      return Object.keys(ro).length ? ro : { ...o };
    });
  }

  if (model.cost && typeof model.cost === 'object') {
    const pricing = {};
    if (typeof model.cost.input === 'number') pricing.input_per_1m = model.cost.input;
    if (typeof model.cost.output === 'number') pricing.output_per_1m = model.cost.output;
    if (typeof model.cost.cache_read === 'number') pricing.cache_read_per_1m = model.cost.cache_read;
    if (typeof model.cost.cache_write === 'number') pricing.cache_write_per_1m = model.cost.cache_write;
    if (Object.keys(pricing).length) entry.pricing = pricing;
  }

  entry.verification = {
    status: 'unverified',
    source: 'provider_catalog',
    verified_at: verifiedAt,
    notes:
      'PT-ME-002 candidate mapped from local models.dev dump; NOT SoT — human must verify before merging into manifests (ARCH-005)',
  };

  return { modelId: id, entry };
}

/**
 * Build candidate report object for allowlisted protocol providers.
 * @param {object} apiJson - models.dev root map { providerId: { models: {...} } }
 * @param {string[]} allowlist - ai-protocol provider ids
 */
export function buildCandidates(apiJson, allowlist, opts = {}) {
  const allow = new Set((allowlist || []).map((s) => s.toLowerCase()));
  const byProvider = {};
  const skippedProviders = [];

  if (!apiJson || typeof apiJson !== 'object' || Array.isArray(apiJson)) {
    throw new Error('models.dev dump must be a JSON object keyed by provider id');
  }

  for (const [rawId, block] of Object.entries(apiJson)) {
    if (rawId.startsWith('_')) continue; // fixture/meta keys
    const canonical = resolveProviderId(rawId);
    if (!canonical || !allow.has(canonical.toLowerCase())) {
      skippedProviders.push({ models_dev_id: rawId, resolved: canonical, reason: 'not_in_allowlist' });
      continue;
    }
    const models = block?.models;
    if (!models || typeof models !== 'object') {
      skippedProviders.push({ models_dev_id: rawId, resolved: canonical, reason: 'no_models' });
      continue;
    }
    if (!byProvider[canonical]) {
      byProvider[canonical] = {
        protocol_id: canonical,
        models_dev_id: rawId,
        name: block.name || null,
        doc: block.doc || null,
        models: {},
      };
    }
    for (const model of Object.values(models)) {
      const mapped = mapModelToCandidate(model, opts);
      if (!mapped) continue;
      byProvider[canonical].models[mapped.modelId] = mapped.entry;
    }
  }

  return {
    meta: {
      role: 'advisory_candidate_only',
      not_sot: true,
      no_cron: true,
      no_dist_write: true,
      verified_at: opts.verifiedAt || '2026-07-24',
      allowlist: [...allow],
      field_scope: 'ME-001 P0/P1 + capacity/pricing hints',
    },
    providers: byProvider,
    skipped_outside_allowlist_count: skippedProviders.filter((s) => s.reason === 'not_in_allowlist').length,
  };
}

/**
 * Diff candidate models against existing manifest metadata.models keys.
 */
export function diffAgainstManifest(candidatesForProvider, existingModels) {
  const existing = existingModels && typeof existingModels === 'object' ? existingModels : {};
  const candIds = Object.keys(candidatesForProvider?.models || {});
  const existIds = Object.keys(existing);
  const missing_in_manifest = candIds.filter((id) => !(id in existing));
  const already_present = candIds.filter((id) => id in existing);
  const only_in_manifest = existIds.filter((id) => !(id in (candidatesForProvider?.models || {})));
  return { missing_in_manifest, already_present, only_in_manifest };
}

export function renderMarkdownReport(report, diffs = {}) {
  const lines = [];
  lines.push('# PT-ME-002 oneshot candidate report');
  lines.push('');
  lines.push('> **Advisory only.** models.dev is **not** authority (ME-001 / ARCH-005).');
  lines.push('> Do **not** auto-merge into `dist/`. No cron. Human verification required.');
  lines.push('');
  lines.push(`- verified_at label: \`${report.meta.verified_at}\``);
  lines.push(`- allowlist: ${report.meta.allowlist.join(', ') || '(empty)'}`);
  lines.push(`- providers matched: ${Object.keys(report.providers).length}`);
  lines.push(`- models.dev providers skipped (outside allowlist): ${report.skipped_outside_allowlist_count}`);
  lines.push('');

  for (const [pid, block] of Object.entries(report.providers).sort(([a], [b]) => a.localeCompare(b))) {
    const n = Object.keys(block.models).length;
    lines.push(`## ${pid} (\`${block.models_dev_id}\`) - ${n} models`);
    if (block.doc) lines.push(`- doc: ${block.doc}`);
    const d = diffs[pid];
    if (d) {
      lines.push(`- missing in current manifest: **${d.missing_in_manifest.length}**`);
      lines.push(`- already present: ${d.already_present.length}`);
      lines.push(`- only in manifest (not in dump slice): ${d.only_in_manifest.length}`);
      if (d.missing_in_manifest.length) {
        lines.push('- candidate ids not in manifest (sample <=12):');
        for (const id of d.missing_in_manifest.slice(0, 12)) lines.push(`  - \`${id}\``);
      }
    }
    lines.push('');
    lines.push('```yaml');
    lines.push(`# candidate fragment for metadata.models (unverified)`);
    for (const [mid, entry] of Object.entries(block.models).slice(0, 5)) {
      lines.push(`${mid}:`);
      lines.push(`  context_window: ${entry.context_window ?? 0}`);
      if (entry.model_capabilities) {
        lines.push(`  model_capabilities:`);
        for (const [k, v] of Object.entries(entry.model_capabilities)) {
          lines.push(`    ${k}: ${v}`);
        }
      }
      if (entry.modalities) {
        lines.push(`  modalities:`);
        if (entry.modalities.input) lines.push(`    input: [${entry.modalities.input.join(', ')}]`);
        if (entry.modalities.output) lines.push(`    output: [${entry.modalities.output.join(', ')}]`);
      }
    }
    if (n > 5) lines.push(`# ... +${n - 5} more models in JSON output`);
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}
