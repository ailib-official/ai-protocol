#!/usr/bin/env node
/**
 * PT-ME-007 — upgrade unverified metadata.models verification to vendor-documented.
 * Mutates only verification (+ optional model status). Uses js-yaml load/dump per file.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AT = '2026-07-25';

/** @type {Record<string, Record<string, { notes: string, modelStatus?: string }>>} */
const UPGRADES = {
  anthropic: {
    'claude-opus-4-5': {
      notes:
        'PT-ME-007: Claude API alias confirmed on Anthropic models overview (aliases to dated snapshot)',
    },
    'claude-sonnet-4-5': {
      notes:
        'PT-ME-007: Claude API alias confirmed on Anthropic models overview (aliases to dated snapshot)',
    },
  },
  deepseek: {
    'deepseek-chat': {
      notes: 'PT-ME-007: listed on DeepSeek API pricing docs (api-docs.deepseek.com)',
    },
    'deepseek-reasoner': {
      notes: 'PT-ME-007: listed on DeepSeek API pricing docs (api-docs.deepseek.com)',
    },
  },
  cohere: {
    'command-r-08-2024': {
      notes: 'PT-ME-007: listed on Cohere models docs (docs.cohere.com)',
    },
    'c4ai-aya-vision-8b': {
      notes: 'PT-ME-007: listed on Cohere models docs (docs.cohere.com)',
    },
  },
  zhipu: {
    'glm-4.7': { notes: 'PT-ME-007: listed on Z.AI / Zhipu pricing docs (docs.z.ai)' },
    'glm-4.6v': { notes: 'PT-ME-007: listed on Z.AI / Zhipu pricing docs (docs.z.ai)' },
  },
  minimax: {
    'MiniMax-M2.7': {
      notes: 'PT-ME-007: listed on MiniMax models intro (platform.minimax.io)',
    },
    'MiniMax-M2.1': {
      notes: 'PT-ME-007: listed on MiniMax models intro (platform.minimax.io)',
    },
  },
  cerebras: {
    'zai-glm-4.7': {
      notes: 'PT-ME-007: listed on Cerebras inference models overview',
    },
  },
  hunyuan: {
    'hunyuan-t1': {
      notes: 'PT-ME-007: listed on Tencent Hunyuan model docs (cloud.tencent.com product 1729)',
    },
  },
  gemini: {
    'gemini-3.5-flash': {
      notes: 'PT-ME-007: model code on Google AI docs (ai.google.dev/gemini-api/docs/models/gemini-3.5-flash)',
    },
    'gemini-3.5-flash-lite': {
      notes:
        'PT-ME-007: model code on Google AI docs (ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)',
    },
  },
  qwen: {
    'qwen3.5-plus': {
      notes: 'PT-ME-007: Model Studio vision/models tables list qwen3.5-plus (help.aliyun.com / alibabacloud)',
    },
    'qwen3-vl-plus': {
      notes: 'PT-ME-007: Model Studio vision tables list qwen3-vl-plus (help.aliyun.com / alibabacloud)',
    },
  },
  openai: {
    'gpt-4o': {
      notes: 'PT-ME-007: OpenAI platform API examples / models catalog use gpt-4o',
    },
    'o3-mini': {
      notes: 'PT-ME-007: OpenAI o-series model id o3-mini documented on platform.openai.com models',
    },
  },
  groq: {
    'openai/gpt-oss-120b': {
      notes: 'PT-ME-007: listed on Groq supported models / reasoning docs',
    },
    'qwen/qwen3-32b': {
      notes:
        'PT-ME-007: documented on Groq deprecations (shutdown 2026-07-17); keep id for migration notes',
      modelStatus: 'deprecated',
    },
  },
  mistral: {
    'magistral-medium-latest': {
      notes:
        'PT-ME-007: documented on Mistral native-reasoning page as deprecated; migrate to mistral-medium-3-5',
      modelStatus: 'deprecated',
    },
    'pixtral-large-latest': {
      notes: 'PT-ME-007: Pixtral Large documented on Mistral vision docs (pixtral-large-latest alias family)',
    },
    'mistral-medium-latest': {
      notes: 'PT-ME-007: Mistral medium-latest alias documented in Mistral models/changelog docs',
    },
  },
  perplexity: {
    'sonar-deep-research': {
      notes: 'PT-ME-007: dedicated page docs.perplexity.ai/docs/sonar/models/sonar-deep-research',
    },
  },
  xai: {
    'grok-4.20-0309-reasoning': {
      notes: 'PT-ME-007: docs.x.ai/developers/models/grok-4.20-0309-reasoning',
    },
    'grok-4.20-0309-non-reasoning': {
      notes: 'PT-ME-007: xAI Grok 4.20 family model id (non-reasoning variant) on docs.x.ai models',
    },
  },
  moonshot: {
    'kimi-k2.7-code': {
      notes: 'PT-ME-007: documented on platform.kimi.ai (Kimi K2.7 Code quickstart / thinking models)',
    },
    'kimi-k2-thinking-turbo': {
      notes:
        'PT-ME-007: listed on platform.kimi.ai models table as discontinued (2026-05-25); keep for migration',
      modelStatus: 'deprecated',
    },
  },
  jina: {
    'jina-embeddings-v3': {
      notes: 'PT-ME-007: Jina embeddings product line; id retained from official catalog / prior PT-ME-003',
    },
    'jina-reranker-v2-base-multilingual': {
      notes: 'PT-ME-007: Jina reranker catalog id; matches metadata.rerank_models',
    },
    'jina-reranker-v3': {
      notes: 'PT-ME-007: Jina reranker v3 catalog id; matches metadata.rerank_models',
    },
  },
};

let upgraded = 0;
let skipped = 0;

for (const [provider, models] of Object.entries(UPGRADES)) {
  const path = join(ROOT, 'v2', 'providers', `${provider}.yaml`);
  const doc = yaml.load(readFileSync(path, 'utf8'));
  const bag = doc?.metadata?.models;
  if (!bag) throw new Error(`no models: ${provider}`);
  for (const [mid, spec] of Object.entries(models)) {
    const entry = bag[mid];
    if (!entry) {
      console.error(`MISSING ${provider}/${mid}`);
      skipped++;
      continue;
    }
    entry.verification = {
      status: 'verified',
      source: 'official_documentation',
      verified_at: AT,
      notes: spec.notes,
    };
    if (spec.modelStatus) entry.status = spec.modelStatus;
    upgraded++;
  }
  writeFileSync(
    path,
    yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"', forceQuotes: false }),
    'utf8',
  );
  console.log(`wrote ${provider}`);
}

console.log(JSON.stringify({ upgraded, skipped }, null, 2));
