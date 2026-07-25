/**
 * PT-ME-002 — pure mapping from models.dev provider/model rows → ME-001 candidate entries.
 * Advisory only; omit = unknown (never invent false for missing bools).
 */
export const MODALITY_ENUM = new Set(['text', 'image', 'audio', 'video', 'pdf']);

/** models.dev provider id → ai-protocol canonical id (whole-block map) */
export const PROVIDER_ID_ALIASES = {
  zhipuai: 'zhipu',
  google: 'gemini',
  'google-vertex': 'gemini',
  moonshotai: 'moonshot',
  'moonshotai-cn': 'moonshot',
  'moonshot-ai': 'moonshot',
  'x-ai': 'xai',
  xai: 'xai',
  'alibaba-cloud': 'qwen',
  alibaba: 'qwen',
  'alibaba-cn': 'qwen',
  dashscope: 'qwen',
  '01-ai': 'yi',
  '01ai': 'yi',
  lingyiwanwu: 'yi',
  'lingyi-wanwu': 'yi',
  'baichuan-ai': 'baichuan',
  'baichuan-inc': 'baichuan',
  ernie: 'baidu',
  qianfan: 'baidu',
  wenxin: 'baidu',
  'baidu-qianfan': 'baidu',
  volcengine: 'doubao',
  'volc-engine': 'doubao',
  byteplus: 'doubao',
  bytedance: 'doubao',
  ark: 'doubao',
  'volcano-ark': 'doubao',
  'tencent-hunyuan': 'hunyuan',
  hunyuan: 'hunyuan',
  'jina-ai': 'jina',
  jinaai: 'jina',
  'perplexity-ai': 'perplexity',
  'mistral-ai': 'mistral',
  minimax: 'minimax',
  'minimax-cn': 'minimax',
};

/**
 * Plan/aggregator blocks that are not 1:1 with a first-party protocol id.
 * Only models matching `model_id_re` are attributed to `protocol_id`.
 * (PT-ME-006 — models.dev often lacks baichuan/baidu/doubao/jina/yi; hunyuan
 * appears inside Tencent Token/Coding plan catalogs.)
 */
export const PROVIDER_SLICE_ROUTES = [
  {
    models_dev_id: 'tencent-coding-plan',
    protocol_id: 'hunyuan',
    model_id_re: /^(hunyuan[-_]|hy\d)/i,
  },
  {
    models_dev_id: 'tencent-tokenhub',
    protocol_id: 'hunyuan',
    model_id_re: /^(hunyuan[-_]|hy\d)/i,
  },
  {
    models_dev_id: 'tencent-token-plan',
    protocol_id: 'hunyuan',
    model_id_re: /^(hunyuan[-_]|hy\d)/i,
  },
];

export function resolveProviderId(modelsDevId) {
  if (!modelsDevId || typeof modelsDevId !== 'string') return null;
  const key = modelsDevId.toLowerCase();
  return PROVIDER_ID_ALIASES[key] || key;
}

function ensureProviderBucket(byProvider, protocolId, modelsDevId, block) {
  if (!byProvider[protocolId]) {
    byProvider[protocolId] = {
      protocol_id: protocolId,
      models_dev_id: modelsDevId,
      name: block?.name || null,
      doc: block?.doc || null,
      models: {},
      source_slices: [],
    };
  }
  const bucket = byProvider[protocolId];
  if (modelsDevId && !bucket.source_slices.includes(modelsDevId)) {
    bucket.source_slices.push(modelsDevId);
  }
  return bucket;
}

function ingestModels(byProvider, protocolId, modelsDevId, block, models, opts, modelFilter) {
  const bucket = ensureProviderBucket(byProvider, protocolId, modelsDevId, block);
  for (const model of Object.values(models || {})) {
    if (modelFilter && !modelFilter(model?.id)) continue;
    const mapped = mapModelToCandidate(model, opts);
    if (!mapped) continue;
    bucket.models[mapped.modelId] = mapped.entry;
  }
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
  const sliceHits = new Set();

  if (!apiJson || typeof apiJson !== 'object' || Array.isArray(apiJson)) {
    throw new Error('models.dev dump must be a JSON object keyed by provider id');
  }

  const sliceByDevId = new Map();
  for (const route of PROVIDER_SLICE_ROUTES) {
    const key = route.models_dev_id.toLowerCase();
    if (!sliceByDevId.has(key)) sliceByDevId.set(key, []);
    sliceByDevId.get(key).push(route);
  }

  for (const [rawId, block] of Object.entries(apiJson)) {
    if (rawId.startsWith('_')) continue; // fixture/meta keys
    const rawKey = rawId.toLowerCase();
    const models = block?.models;
    const routes = sliceByDevId.get(rawKey) || [];
    let ingested = false;

    // Whole-block alias (skip when this dump id is only a filtered slice source)
    const canonical = resolveProviderId(rawId);
    const wholeBlockOk =
      canonical &&
      allow.has(canonical.toLowerCase()) &&
      // Do not whole-map Tencent plan catalogs onto hunyuan (mixed vendors)
      !routes.some((r) => r.protocol_id === canonical);

    if (wholeBlockOk) {
      if (!models || typeof models !== 'object') {
        skippedProviders.push({ models_dev_id: rawId, resolved: canonical, reason: 'no_models' });
      } else {
        ingestModels(byProvider, canonical, rawId, block, models, opts, null);
        ingested = true;
      }
    }

    for (const route of routes) {
      if (!allow.has(route.protocol_id.toLowerCase())) continue;
      if (!models || typeof models !== 'object') continue;
      const re = route.model_id_re;
      ingestModels(byProvider, route.protocol_id, rawId, block, models, opts, (id) =>
        typeof id === 'string' && re.test(id),
      );
      sliceHits.add(`${rawId}→${route.protocol_id}`);
      ingested = true;
    }

    if (!ingested) {
      skippedProviders.push({
        models_dev_id: rawId,
        resolved: canonical,
        reason: routes.length ? 'slice_no_allowlist_hit' : 'not_in_allowlist',
      });
    }
  }

  const allowlist_unmatched = [...allow].filter((id) => !byProvider[id]);

  return {
    meta: {
      role: 'advisory_candidate_only',
      not_sot: true,
      no_cron: true,
      no_dist_write: true,
      verified_at: opts.verifiedAt || '2026-07-24',
      allowlist: [...allow],
      field_scope: 'ME-001 P0/P1 + capacity/pricing hints',
      slice_routes_applied: [...sliceHits].sort(),
      allowlist_unmatched,
      note_unmatched:
        allowlist_unmatched.length === 0
          ? null
          : 'Allowlist ids with zero dump coverage after aliases+slices — often absent from models.dev (not just missing aliases).',
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
  if (report.meta.slice_routes_applied?.length) {
    lines.push(`- slice routes applied: ${report.meta.slice_routes_applied.join(', ')}`);
  }
  if (report.meta.allowlist_unmatched?.length) {
    lines.push(
      `- allowlist unmatched (no dump coverage): **${report.meta.allowlist_unmatched.join(', ')}**`,
    );
    if (report.meta.note_unmatched) lines.push(`  - ${report.meta.note_unmatched}`);
  }
  lines.push('');

  for (const [pid, block] of Object.entries(report.providers).sort(([a], [b]) => a.localeCompare(b))) {
    const n = Object.keys(block.models).length;
    const src =
      block.source_slices?.length > 1
        ? block.source_slices.map((s) => `\`${s}\``).join(', ')
        : `\`${block.models_dev_id}\``;
    lines.push(`## ${pid} (${src}) - ${n} models`);
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
