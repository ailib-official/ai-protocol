#!/usr/bin/env node
/**
 * PT-ME-003 one-shot helper: write curated metadata.models (+ Experimental
 * model_capabilities) into v2/providers/*.yaml for ai_provider baseline.
 * Not a cron / SoT sync — human-curated maps below.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = {
  status: 'verified',
  source: 'provider_catalog',
  verified_at: '2026-07-24',
  notes: 'PT-ME-003 baseline; cross-checked with public catalog / v1 models / official docs',
};
const Vo = {
  status: 'verified',
  source: 'official_documentation',
  verified_at: '2026-07-24',
};

function caps(tool_call, structured_output, reasoning, attachment) {
  const o = {};
  if (tool_call !== undefined) o.tool_call = tool_call;
  if (structured_output !== undefined) o.structured_output = structured_output;
  if (reasoning !== undefined) o.reasoning = reasoning;
  if (attachment !== undefined) o.attachment = attachment;
  return o;
}

function mod(input, output = ['text']) {
  return { input, output };
}

function entry(base, mc, modalities, extra = {}) {
  return {
    ...base,
    model_capabilities: mc,
    modalities,
    verification: extra.verification || V,
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'verification')),
  };
}

const UPDATES = {
  cohere: {
    models: {
      'command-a-03-2025': entry(
        { context_window: 256000, max_output_tokens: 8192, family: 'command-a', pricing: { input_per_1m: 2.5, output_per_1m: 10 } },
        caps(true, undefined, false, false),
        mod(['text']),
      ),
      'command-a-reasoning-08-2025': entry(
        { context_window: 256000, max_output_tokens: 8192, family: 'command-a', pricing: { input_per_1m: 2.5, output_per_1m: 10 } },
        caps(true, undefined, true, false),
        mod(['text']),
      ),
      'command-a-vision-07-2025': entry(
        { context_window: 128000, max_output_tokens: 8192, family: 'command-a', pricing: { input_per_1m: 2.5, output_per_1m: 10 } },
        caps(false, undefined, false, true),
        mod(['text', 'image']),
      ),
      'command-a-plus-05-2026': entry(
        { context_window: 128000, max_output_tokens: 8192, family: 'command-a', pricing: { input_per_1m: 2.5, output_per_1m: 10 } },
        caps(true, true, true, true),
        mod(['text', 'image']),
      ),
      'command-r-plus-08-2024': entry(
        { context_window: 128000, max_output_tokens: 4096, family: 'command-r', pricing: { input_per_1m: 2.5, output_per_1m: 10 } },
        caps(true, undefined, false, false),
        mod(['text']),
      ),
    },
  },
  qwen: {
    models: {
      'qwen-max': entry(
        { context_window: 262144, max_output_tokens: 8192, family: 'qwen-max' },
        caps(true, undefined, undefined, false),
        mod(['text']),
        { verification: { ...Vo, notes: 'PT-ME-003 from v1 models + DashScope naming' } },
      ),
      'qwen-turbo': entry(
        { context_window: 131072, max_output_tokens: 8192, family: 'qwen-turbo' },
        caps(true, undefined, undefined, true),
        mod(['text', 'image']),
        { verification: { ...Vo, notes: 'PT-ME-003 from v1 models; vision-capable turbo class' } },
      ),
      'qwen3.5-122b-a10b': entry(
        { context_window: 262144, max_output_tokens: 65536, family: 'qwen3.5', pricing: { input_per_1m: 0.4, output_per_1m: 1.2 } },
        caps(true, true, true, true),
        mod(['text', 'image', 'video', 'audio']),
      ),
      'qwen3-coder-plus': entry(
        { context_window: 1048576, max_output_tokens: 65536, family: 'qwen3-coder', pricing: { input_per_1m: 1.0, output_per_1m: 4.0 } },
        caps(true, undefined, false, false),
        mod(['text']),
      ),
      'qwen-vl-max': entry(
        { context_window: 131072, max_output_tokens: 8192, family: 'qwen-vl', pricing: { input_per_1m: 0.8, output_per_1m: 3.2 } },
        caps(true, undefined, false, true),
        mod(['text', 'image']),
      ),
      'qwen3-next-80b-a3b-thinking': entry(
        { context_window: 131072, max_output_tokens: 16384, family: 'qwen3-next', pricing: { input_per_1m: 0.5, output_per_1m: 2.0 } },
        caps(true, undefined, true, false),
        mod(['text']),
      ),
    },
  },
  doubao: {
    models: {
      'doubao-pro-32k': entry(
        { context_window: 32768, max_output_tokens: 4096, family: 'doubao-pro', pricing: { input_per_1m: 0.8, output_per_1m: 2.0 } },
        caps(true, undefined, false, false),
        mod(['text']),
        { verification: { status: 'unverified', source: 'official_documentation', verified_at: '2026-07-24', notes: 'PT-ME-003 migrated from v1/models/doubao; Ark endpoint id may differ' } },
      ),
      'doubao-pro-128k': entry(
        { context_window: 131072, max_output_tokens: 4096, family: 'doubao-pro', pricing: { input_per_1m: 5.0, output_per_1m: 9.0 } },
        caps(true, undefined, false, false),
        mod(['text']),
        { verification: { status: 'unverified', source: 'official_documentation', verified_at: '2026-07-24', notes: 'PT-ME-003 from v1/models/doubao' } },
      ),
      'doubao-lite-32k': entry(
        { context_window: 32768, max_output_tokens: 4096, family: 'doubao-lite' },
        caps(true, undefined, false, false),
        mod(['text']),
        { verification: { status: 'unverified', source: 'official_documentation', verified_at: '2026-07-24', notes: 'PT-ME-003 from v1/models/doubao' } },
      ),
      'doubao-vision-pro-32k': entry(
        { context_window: 32768, max_output_tokens: 4096, family: 'doubao-vision' },
        caps(true, undefined, false, true),
        mod(['text', 'image']),
        { verification: { status: 'unverified', source: 'official_documentation', verified_at: '2026-07-24', notes: 'PT-ME-003 from v1/models/doubao' } },
      ),
    },
  },
  jina: {
    models: {
      'jina-embeddings-v3': entry(
        { context_window: 8192, max_output_tokens: 0, family: 'jina-embeddings' },
        caps(false, undefined, false, false),
        mod(['text'], ['text']),
        { verification: { status: 'unverified', source: 'official_documentation', verified_at: '2026-07-24', notes: 'PT-ME-003 from v1/models/jina; embedding model' } },
      ),
      'jina-reranker-v2-base-multilingual': entry(
        { context_window: 1024, max_output_tokens: 0, family: 'jina-reranker' },
        caps(false, undefined, false, false),
        mod(['text'], ['text']),
        { verification: { status: 'unverified', source: 'official_documentation', verified_at: '2026-07-24', notes: 'PT-ME-003; matches metadata.rerank_models default' } },
      ),
      'jina-reranker-v3': entry(
        { context_window: 1024, max_output_tokens: 0, family: 'jina-reranker' },
        caps(false, undefined, false, false),
        mod(['text'], ['text']),
        { verification: { status: 'unverified', source: 'official_documentation', verified_at: '2026-07-24', notes: 'PT-ME-003; listed in metadata.rerank_models' } },
      ),
    },
  },
  anthropic: {
    mergeModels: {
      'claude-opus-4-8': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'pdf']),
        family: 'claude-opus',
        verification: Vo,
      },
      'claude-sonnet-4-6': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'pdf']),
        family: 'claude-sonnet',
        verification: Vo,
      },
      'claude-haiku-4-5': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'pdf']),
        family: 'claude-haiku',
        verification: Vo,
      },
    },
  },
  openai: {
    mergeModels: {
      'gpt-5.5': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'pdf']),
        family: 'gpt-5',
        verification: Vo,
      },
      'gpt-5.4': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'pdf']),
        family: 'gpt-5',
        verification: Vo,
      },
      'gpt-5.4-mini': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image']),
        family: 'gpt-5',
        verification: Vo,
      },
      'gpt-5.3-codex': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image']),
        family: 'gpt-5-codex',
        verification: Vo,
      },
      'gpt-4o-mini': {
        model_capabilities: caps(true, true, false, true),
        modalities: mod(['text', 'image']),
        family: 'gpt-4o',
        verification: Vo,
      },
      o3: entry(
        { context_window: 200000, max_output_tokens: 100000, family: 'o-series', pricing: { input_per_1m: 2.0, output_per_1m: 8.0 } },
        caps(true, true, true, true),
        mod(['text', 'image', 'pdf']),
        { verification: Vo },
      ),
    },
    addModels: true,
  },
  gemini: {
    mergeModels: {
      'gemini-3-pro': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'video', 'audio', 'pdf']),
        family: 'gemini-3',
        verification: Vo,
      },
      'gemini-3-flash': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'video', 'audio', 'pdf']),
        family: 'gemini-3',
        verification: Vo,
      },
      'gemini-2.5-flash-lite': {
        model_capabilities: caps(true, true, false, true),
        modalities: mod(['text', 'image', 'audio', 'video', 'pdf']),
        family: 'gemini-2.5',
        verification: Vo,
      },
      'gemini-2.5-flash': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'audio', 'video', 'pdf']),
        family: 'gemini-2.5',
        verification: Vo,
      },
      'gemini-2.5-pro': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'audio', 'video', 'pdf']),
        family: 'gemini-2.5',
        verification: Vo,
      },
      'gemini-3.1-flash-lite-preview': {
        model_capabilities: caps(true, true, true, true),
        modalities: mod(['text', 'image', 'video', 'audio', 'pdf']),
        family: 'gemini-3.1',
        verification: Vo,
      },
    },
  },
  moonshot: {
    mergeModels: {
      'kimi-k2-5': {
        model_capabilities: caps(true, true, true, false),
        modalities: mod(['text', 'image', 'video']),
        family: 'kimi-k2',
        verification: Vo,
      },
      'kimi-k2-thinking': {
        model_capabilities: caps(true, undefined, true, false),
        modalities: mod(['text']),
        thinking: 'thinking',
        family: 'kimi-k2',
        verification: Vo,
      },
    },
    addModels: {
      'kimi-k2.6': entry(
        { context_window: 262144, max_output_tokens: 33000, family: 'kimi-k2', pricing: { input_per_1m: 0.95, output_per_1m: 3.8 } },
        caps(true, true, true, true),
        mod(['text', 'image', 'video']),
        { verification: Vo },
      ),
    },
  },
  zhipu: {
    mergeModels: {
      'glm-5.2': {
        model_capabilities: caps(true, true, true, false),
        modalities: mod(['text']),
        family: 'glm-5',
        verification: Vo,
      },
      'glm-5v-turbo': {
        model_capabilities: caps(true, undefined, true, true),
        modalities: mod(['text', 'image', 'video', 'pdf']),
        family: 'glm-5v',
        verification: Vo,
      },
      'glm-5.1': {
        model_capabilities: caps(true, true, true, false),
        modalities: mod(['text']),
        family: 'glm-5',
        verification: Vo,
      },
      'glm-5': {
        model_capabilities: caps(true, undefined, true, false),
        modalities: mod(['text']),
        family: 'glm-5',
        verification: Vo,
      },
    },
  },
  groq: {
    mergeModels: {
      'llama-3.1-8b-instant': {
        model_capabilities: caps(true, undefined, false, false),
        modalities: mod(['text']),
        family: 'llama-3.1',
        verification: Vo,
      },
    },
    addModels: {
      'llama-3.3-70b-versatile': entry(
        { context_window: 131072, max_output_tokens: 32768, family: 'llama-3.3', pricing: { input_per_1m: 0.59, output_per_1m: 0.79 } },
        caps(true, undefined, false, false),
        mod(['text']),
        { verification: Vo },
      ),
      'meta-llama/llama-4-scout-17b-16e-instruct': entry(
        { context_window: 131072, max_output_tokens: 8192, family: 'llama-4', pricing: { input_per_1m: 0.11, output_per_1m: 0.34 } },
        caps(true, true, false, true),
        mod(['text', 'image']),
        { verification: Vo },
      ),
    },
  },
};

for (const [id, spec] of Object.entries(UPDATES)) {
  const path = join(ROOT, 'v2', 'providers', `${id}.yaml`);
  const doc = yaml.load(readFileSync(path, 'utf8'));
  if (!doc.metadata) doc.metadata = {};
  if (!doc.metadata.models) doc.metadata.models = {};

  if (spec.models) {
    doc.metadata.models = { ...doc.metadata.models, ...spec.models };
  }
  if (spec.mergeModels) {
    for (const [mid, patch] of Object.entries(spec.mergeModels)) {
      const cur = doc.metadata.models[mid] || {};
      if (patch.context_window && !cur.context_window) {
        // full entry from entry()
        doc.metadata.models[mid] = patch;
      } else {
        doc.metadata.models[mid] = { ...cur, ...patch };
      }
    }
  }
  if (spec.addModels && typeof spec.addModels === 'object' && spec.addModels !== true) {
    doc.metadata.models = { ...doc.metadata.models, ...spec.addModels };
  }
  if (spec.addModels === true && spec.mergeModels) {
    // openai: mergeModels may contain full entries for new keys
    for (const [mid, patch] of Object.entries(spec.mergeModels)) {
      if (!doc.metadata.models[mid] || patch.context_window) {
        const cur = doc.metadata.models[mid] || {};
        doc.metadata.models[mid] = { ...cur, ...patch };
      }
    }
  }

  const out = yaml.dump(doc, {
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  writeFileSync(path, out.endsWith('\n') ? out : out + '\n');
  console.log('updated', id, 'models=', Object.keys(doc.metadata.models).length);
}
