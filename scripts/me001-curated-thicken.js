#!/usr/bin/env node
/**
 * PT-ME-005 — curated short-list thicken (advisory oneshot → human-picked ids only).
 * Merges into v2/providers/*.yaml metadata.models; does not touch dist/ directly (run build after).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = {
  status: 'unverified',
  source: 'provider_catalog',
  verified_at: '2026-07-25',
  notes: 'PT-ME-005 curated thicken from oneshot gap; confirm on vendor docs before treating as strong SoT',
};

function entry(e) {
  const out = {};
  if (typeof e.context_window === 'number') out.context_window = e.context_window;
  if (typeof e.max_output_tokens === 'number') out.max_output_tokens = e.max_output_tokens;
  out.status = e.status || 'active';
  if (e.family) out.family = e.family;
  if (e.knowledge_cutoff) out.knowledge_cutoff = e.knowledge_cutoff;
  if (typeof e.open_weights === 'boolean') out.open_weights = e.open_weights;
  if (e.mc && Object.keys(e.mc).length) out.model_capabilities = e.mc;
  if (e.mod && Object.keys(e.mod).length) out.modalities = e.mod;
  if (e.pricing) out.pricing = e.pricing;
  out.verification = { ...V };
  if (e.note) out.verification.notes = `${V.notes}; ${e.note}`;
  return out;
}

/** provider_id → model_id → raw pick */
const ADDS = {
  deepseek: {
    'deepseek-chat': entry({
      context_window: 1000000,
      max_output_tokens: 384000,
      family: 'deepseek',
      knowledge_cutoff: '2025-09',
      open_weights: true,
      mc: { tool_call: true, reasoning: false, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.14, output_per_1m: 0.28, cache_read_per_1m: 0.0028 },
      note: 'API alias still widely used alongside deepseek-v4-*',
    }),
    'deepseek-reasoner': entry({
      context_window: 1000000,
      max_output_tokens: 384000,
      family: 'deepseek-thinking',
      knowledge_cutoff: '2025-09',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.14, output_per_1m: 0.28, cache_read_per_1m: 0.0028 },
    }),
  },
  perplexity: {
    'sonar-deep-research': entry({
      context_window: 128000,
      max_output_tokens: 32768,
      family: 'sonar',
      knowledge_cutoff: '2025-01',
      open_weights: false,
      mc: { tool_call: false, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 2, output_per_1m: 8 },
    }),
  },
  cerebras: {
    'zai-glm-4.7': entry({
      context_window: 131072,
      max_output_tokens: 40960,
      family: 'glm',
      status: 'public_preview',
      open_weights: true,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 2.25, output_per_1m: 2.75 },
      note: 'Cerebras Preview catalog; may rotate',
    }),
  },
  minimax: {
    'MiniMax-M2.7': entry({
      context_window: 204800,
      max_output_tokens: 131072,
      family: 'minimax-m2',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.3, output_per_1m: 1.2 },
    }),
    'MiniMax-M2.1': entry({
      context_window: 204800,
      max_output_tokens: 131072,
      family: 'minimax-m2',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.3, output_per_1m: 1.2 },
    }),
  },
  mistral: {
    'magistral-medium-latest': entry({
      context_window: 128000,
      max_output_tokens: 16384,
      family: 'magistral-medium',
      knowledge_cutoff: '2025-06',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 2, output_per_1m: 5 },
    }),
    'pixtral-large-latest': entry({
      context_window: 128000,
      max_output_tokens: 128000,
      family: 'pixtral',
      knowledge_cutoff: '2024-11',
      open_weights: true,
      mc: { tool_call: true, reasoning: false, attachment: true },
      mod: { input: ['text', 'image'], output: ['text'] },
      pricing: { input_per_1m: 2, output_per_1m: 6 },
    }),
    'mistral-medium-latest': entry({
      context_window: 262144,
      max_output_tokens: 262144,
      family: 'mistral-medium',
      open_weights: true,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image'], output: ['text'] },
      pricing: { input_per_1m: 1.5, output_per_1m: 7.5 },
    }),
  },
  xai: {
    'grok-4.20-0309-reasoning': entry({
      context_window: 1000000,
      max_output_tokens: 30000,
      family: 'grok-4',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'pdf'], output: ['text'] },
      pricing: { input_per_1m: 1.25, output_per_1m: 2.5, cache_read_per_1m: 0.2 },
    }),
    'grok-4.20-0309-non-reasoning': entry({
      context_window: 1000000,
      max_output_tokens: 30000,
      family: 'grok-4',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: false, attachment: true },
      mod: { input: ['text', 'image', 'pdf'], output: ['text'] },
      pricing: { input_per_1m: 1.25, output_per_1m: 2.5, cache_read_per_1m: 0.2 },
    }),
  },
  zhipu: {
    'glm-4.7': entry({
      context_window: 204800,
      max_output_tokens: 131072,
      family: 'glm-4',
      knowledge_cutoff: '2025-04',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.6, output_per_1m: 2.2 },
    }),
    'glm-4.6v': entry({
      context_window: 128000,
      max_output_tokens: 32768,
      family: 'glm-4',
      knowledge_cutoff: '2025-04',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'video'], output: ['text'] },
      pricing: { input_per_1m: 0.3, output_per_1m: 0.9 },
    }),
  },
  moonshot: {
    'kimi-k2-thinking-turbo': entry({
      context_window: 262144,
      max_output_tokens: 262144,
      family: 'kimi-thinking',
      knowledge_cutoff: '2024-08',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 1.15, output_per_1m: 8 },
    }),
    'kimi-k2.7-code': entry({
      context_window: 262144,
      max_output_tokens: 262144,
      family: 'kimi-k2',
      knowledge_cutoff: '2025-01',
      open_weights: true,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'video'], output: ['text'] },
      pricing: { input_per_1m: 0.95, output_per_1m: 4 },
    }),
  },
  groq: {
    'openai/gpt-oss-120b': entry({
      context_window: 131072,
      max_output_tokens: 65536,
      family: 'gpt-oss',
      open_weights: true,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.15, output_per_1m: 0.6 },
      note: 'Hosted open-weight OSS on Groq',
    }),
    'qwen/qwen3-32b': entry({
      context_window: 131072,
      max_output_tokens: 40960,
      family: 'qwen3',
      open_weights: true,
      mc: { tool_call: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.29, output_per_1m: 0.59 },
    }),
  },
  openai: {
    'gpt-4o': entry({
      context_window: 128000,
      max_output_tokens: 16384,
      family: 'gpt-4o',
      knowledge_cutoff: '2023-09',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: false, attachment: true },
      mod: { input: ['text', 'image', 'pdf'], output: ['text'] },
      pricing: { input_per_1m: 2.5, output_per_1m: 10 },
      note: 'Still widely referenced stable multimodal id',
    }),
    'o3-mini': entry({
      context_window: 200000,
      max_output_tokens: 100000,
      family: 'o-mini',
      knowledge_cutoff: '2024-05',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 1.1, output_per_1m: 4.4 },
    }),
  },
  gemini: {
    'gemini-3.5-flash': entry({
      context_window: 1048576,
      max_output_tokens: 65536,
      family: 'gemini-flash',
      knowledge_cutoff: '2025-01',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'video', 'audio', 'pdf'], output: ['text'] },
      pricing: { input_per_1m: 1.5, output_per_1m: 9 },
    }),
    'gemini-3.5-flash-lite': entry({
      context_window: 1048576,
      max_output_tokens: 65536,
      family: 'gemini-flash-lite',
      knowledge_cutoff: '2026-03',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'video', 'audio', 'pdf'], output: ['text'] },
      pricing: { input_per_1m: 0.3, output_per_1m: 2.5 },
    }),
  },
  qwen: {
    'qwen3.5-plus': entry({
      context_window: 1000000,
      max_output_tokens: 65536,
      family: 'qwen3.5',
      knowledge_cutoff: '2025-04',
      open_weights: false,
      mc: { tool_call: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'video'], output: ['text'] },
      pricing: { input_per_1m: 0.4, output_per_1m: 2.4 },
    }),
    'qwen3-vl-plus': entry({
      context_window: 262144,
      max_output_tokens: 32768,
      family: 'qwen3-vl',
      knowledge_cutoff: '2025-04',
      open_weights: false,
      mc: { tool_call: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image'], output: ['text'] },
      pricing: { input_per_1m: 0.2, output_per_1m: 1.6 },
    }),
  },
  cohere: {
    'command-r-08-2024': entry({
      context_window: 128000,
      max_output_tokens: 4000,
      family: 'command-r',
      knowledge_cutoff: '2024-06-01',
      open_weights: true,
      mc: { tool_call: true, reasoning: false, attachment: false },
      mod: { input: ['text'], output: ['text'] },
      pricing: { input_per_1m: 0.15, output_per_1m: 0.6 },
    }),
    'c4ai-aya-vision-8b': entry({
      context_window: 16000,
      max_output_tokens: 4000,
      family: 'aya',
      open_weights: true,
      mc: { tool_call: false, reasoning: false, attachment: true },
      mod: { input: ['text', 'image'], output: ['text'] },
    }),
  },
  anthropic: {
    'claude-opus-4-5': entry({
      context_window: 200000,
      max_output_tokens: 64000,
      family: 'claude-opus',
      knowledge_cutoff: '2025-05',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'pdf'], output: ['text'] },
      pricing: { input_per_1m: 5, output_per_1m: 25 },
      note: 'Common API id alongside newer claude-opus-4-8 pin',
    }),
    'claude-sonnet-4-5': entry({
      context_window: 1000000,
      max_output_tokens: 64000,
      family: 'claude-sonnet',
      knowledge_cutoff: '2025-07-31',
      open_weights: false,
      mc: { tool_call: true, structured_output: true, reasoning: true, attachment: true },
      mod: { input: ['text', 'image', 'pdf'], output: ['text'] },
      pricing: { input_per_1m: 3, output_per_1m: 15 },
    }),
  },
};

let total = 0;
for (const [pid, models] of Object.entries(ADDS)) {
  const path = join(ROOT, 'v2', 'providers', `${pid}.yaml`);
  const doc = yaml.load(readFileSync(path, 'utf8'));
  if (!doc.metadata) doc.metadata = {};
  if (!doc.metadata.models) doc.metadata.models = {};
  let added = 0;
  for (const [mid, body] of Object.entries(models)) {
    if (doc.metadata.models[mid]) {
      console.log(`skip existing ${pid}/${mid}`);
      continue;
    }
    doc.metadata.models[mid] = body;
    added++;
    total++;
  }
  const n = Object.keys(doc.metadata.models).length;
  if (n > 8) {
    console.warn(`WARN ${pid} now has ${n} models (>8 soft cap); review`);
  }
  writeFileSync(path, yaml.dump(doc, { lineWidth: 100, noRefs: true, quotingType: '"' }), 'utf8');
  console.log(`${pid}: +${added} → ${n} models`);
}
console.log(`total added: ${total}`);
