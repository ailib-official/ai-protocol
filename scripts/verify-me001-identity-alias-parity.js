#!/usr/bin/env node
/**
 * GOV-007-PROTOCOL-002: overlapping alias keys between provider-identity SoT
 * and ME-001 oneshot map must resolve to the same canonical id.
 */
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { PROVIDER_ID_ALIASES } from './lib/me001-oneshot-map.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const IDENTITY_PATH = join(ROOT, 'v2', 'provider-identity.fixture.json');

function loadIdentityAliasToCanonical() {
  const doc = JSON.parse(readFileSync(IDENTITY_PATH, 'utf8'));
  /** @type {Record<string, string>} */
  const map = {};
  for (const family of doc.families ?? []) {
    const canonical = String(family.canonical_id || '').toLowerCase();
    if (!canonical) continue;
    map[canonical] = canonical;
    for (const alias of family.aliases ?? []) {
      const key = String(alias).toLowerCase();
      if (!key) continue;
      map[key] = canonical;
    }
  }
  return map;
}

function verify() {
  const identity = loadIdentityAliasToCanonical();
  const errors = [];

  for (const [alias, meCanonical] of Object.entries(PROVIDER_ID_ALIASES)) {
    const key = alias.toLowerCase();
    const identityCanonical = identity[key];
    if (!identityCanonical) continue;
    const me = String(meCanonical).toLowerCase();
    if (me !== identityCanonical) {
      errors.push(
        `alias '${key}': ME001→${me} but provider-identity→${identityCanonical}`,
      );
    }
  }

  if (errors.length) {
    console.error('GOV-007 ME001/identity alias parity FAILED:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const overlap = Object.keys(PROVIDER_ID_ALIASES).filter((k) => identity[k.toLowerCase()]);
  console.log(
    `GOV-007 ME001/identity alias parity OK (${overlap.length} overlapping key(s) checked)`,
  );
}

verify();
