#!/usr/bin/env node
/**
 * PT-075-R4: verify dist/v1/models capacity matches dist/v2-alpha/providers metadata.models
 * for providers covered by migrate-v1-capacity-to-v2alpha.js mapping.
 */
import { readFileSync, readdirSync } from 'fs';
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

function v1MaxOutput(model) {
  return model.max_output_tokens ?? model.max_output ?? 0;
}

function collectV1ByProvider() {
  /** @type {Record<string, Record<string, object>>} */
  const byProvider = {};

  for (const file of readdirSync(V1_DIR).filter((f) => f.endsWith('.json'))) {
    const doc = loadJson(join(V1_DIR, file));
    for (const [modelKey, model] of Object.entries(doc.models ?? {})) {
      const provider = model.provider;
      if (!provider || !PROVIDER_MAP[provider]) continue;
      if (!byProvider[provider]) byProvider[provider] = {};
      byProvider[provider][modelKey] = model;
    }
  }

  return byProvider;
}

function verify() {
  const v1 = collectV1ByProvider();
  const errors = [];
  let checked = 0;

  for (const [provider, models] of Object.entries(v1)) {
    const manifest = loadJson(join(V2A_DIR, PROVIDER_MAP[provider]));
    const v2models = manifest.metadata?.models ?? {};

    for (const [modelKey, v1Entry] of Object.entries(models)) {
      const v1Ctx = v1Entry.context_window ?? 0;
      const v1Out = v1MaxOutput(v1Entry);
      if (v1Ctx === 0 && v1Out === 0) continue;

      checked += 1;
      const v2Entry = v2models[modelKey];
      if (!v2Entry) {
        errors.push(`${provider}/${modelKey}: missing in v2-alpha metadata.models`);
        continue;
      }

      const v2Ctx = v2Entry.context_window ?? 0;
      const v2Out = v2Entry.max_output_tokens ?? 0;

      if (v1Ctx > 0 && v2Ctx !== v1Ctx) {
        errors.push(
          `${provider}/${modelKey}: context_window v1=${v1Ctx} v2=${v2Ctx}`,
        );
      }
      if (v1Out > 0 && v2Out !== v1Out) {
        errors.push(
          `${provider}/${modelKey}: max_output_tokens v1=${v1Out} v2=${v2Out}`,
        );
      }
    }
  }

  if (errors.length) {
    console.error('PT-075-R4 capacity parity FAILED:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`PT-075-R4 capacity parity OK (${checked} model(s) with v1 capacity checked)`);
}

verify();
