#!/usr/bin/env node
/**
 * PT-073h-R5 / QA-protocol-009: errors.json ↔ error-codes.yaml parity check.
 */
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function codesFromErrorsJson() {
  const doc = JSON.parse(readFileSync(join(ROOT, 'schemas/v2/errors.json'), 'utf8'));
  const out = new Map();
  const groups = doc.properties?.error_codes?.properties ?? {};
  for (const group of Object.values(groups)) {
    if (!group?.properties) continue;
    for (const [code, def] of Object.entries(group.properties)) {
      out.set(code, def.const_name ?? '');
    }
  }
  return out;
}

function codesFromYaml() {
  const doc = yaml.load(readFileSync(join(ROOT, 'schemas/v2/error-codes.yaml'), 'utf8'));
  const out = new Map();
  for (const [code, def] of Object.entries(doc.error_codes ?? {})) {
    out.set(code, def.name ?? '');
  }
  return out;
}

function main() {
  const jsonCodes = codesFromErrorsJson();
  const yamlCodes = codesFromYaml();
  const errors = [];

  for (const [code, jsonName] of jsonCodes) {
    if (!yamlCodes.has(code)) {
      errors.push(`missing in error-codes.yaml: ${code}`);
      continue;
    }
    const yamlName = yamlCodes.get(code);
    if (jsonName && yamlName && jsonName !== yamlName) {
      errors.push(`name mismatch ${code}: json=${jsonName} yaml=${yamlName}`);
    }
  }

  for (const code of yamlCodes.keys()) {
    if (!jsonCodes.has(code)) {
      errors.push(`missing in errors.json: ${code}`);
    }
  }

  if (errors.length) {
    console.error('error-codes sync failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }

  console.log(`error-codes sync OK (${jsonCodes.size} codes)`);
}

main();
