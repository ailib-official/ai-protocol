#!/usr/bin/env node
/**
 * PT-075-R2: merge dist/v1/models/*.json capacity into dist/v2-alpha/providers/*.json metadata.models
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const V1_DIR = join(ROOT, 'dist/v1/models');
const V2A_DIR = join(ROOT, 'dist/v2-alpha/providers');

const PROVIDER_MAP = {
  openai: 'openai.json',
  anthropic: 'anthropic.json',
  google: 'gemini.json',
  gemini: 'gemini.json',
};

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectV1Models() {
  /** @type {Record<string, Record<string, object>>} */
  const byProvider = {};

  for (const file of readdirSync(V1_DIR).filter((f) => f.endsWith('.json'))) {
    const doc = loadJson(join(V1_DIR, file));
    for (const [key, model] of Object.entries(doc.models ?? {})) {
      const provider = model.provider;
      if (!provider || !PROVIDER_MAP[provider]) continue;

      if (!byProvider[provider]) byProvider[provider] = {};

      /** @type {Record<string, unknown>} */
      const entry = {
        context_window: model.context_window ?? 0,
        max_output_tokens: model.max_output_tokens ?? model.max_output ?? 0,
      };

      if (model.verification) entry.verification = model.verification;
      if (model.status) entry.status = model.status;

      byProvider[provider][key] = entry;
    }
  }

  return byProvider;
}

function mergeIntoV2Alpha() {
  const v1 = collectV1Models();
  let updated = 0;

  for (const [provider, models] of Object.entries(v1)) {
    const rel = PROVIDER_MAP[provider];
    const path = join(V2A_DIR, rel);
    const manifest = loadJson(path);

    manifest.metadata = manifest.metadata ?? {};
    manifest.metadata.models = {
      ...(manifest.metadata.models ?? {}),
      ...models,
    };

    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    updated += Object.keys(models).length;
    console.log(`merged ${Object.keys(models).length} models -> ${rel}`);
  }

  console.log(`PT-075-R2 migrate: ${updated} model entries written`);
}

mergeIntoV2Alpha();
