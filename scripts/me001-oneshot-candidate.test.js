#!/usr/bin/env node
/**
 * PT-ME-002 unit tests (node:test) — mapping + allowlist filter.
 * Run: node --test scripts/me001-oneshot-candidate.test.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveProviderId,
  mapModelToCandidate,
  buildCandidates,
  filterModalities,
  diffAgainstManifest,
} from './lib/me001-oneshot-map.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SNIPPET = JSON.parse(
  readFileSync(join(ROOT, 'fixtures', 'me001-oneshot-snippet.json'), 'utf8'),
);

test('resolveProviderId aliases zhipuai → zhipu', () => {
  assert.equal(resolveProviderId('zhipuai'), 'zhipu');
  assert.equal(resolveProviderId('openai'), 'openai');
  assert.equal(resolveProviderId('google'), 'gemini');
});

test('filterModalities drops unknown tokens', () => {
  assert.deepEqual(filterModalities(['text', 'bogus', 'image']), ['text', 'image']);
  assert.equal(filterModalities(['bogus']), undefined);
});

test('mapModelToCandidate omits unknown bools; keeps P0/P1', () => {
  const mapped = mapModelToCandidate({
    id: 'm1',
    tool_call: true,
    // structured_output omitted → unknown
    reasoning: false,
    attachment: true,
    modalities: { input: ['text', 'image'], output: ['text'] },
    family: 'fam',
    knowledge: '2025-01',
    open_weights: false,
    limit: { context: 1000, output: 200 },
    cost: { input: 1, output: 2 },
  });
  assert.equal(mapped.modelId, 'm1');
  assert.equal(mapped.entry.model_capabilities.tool_call, true);
  assert.equal(mapped.entry.model_capabilities.reasoning, false);
  assert.equal(mapped.entry.model_capabilities.attachment, true);
  assert.equal('structured_output' in mapped.entry.model_capabilities, false);
  assert.deepEqual(mapped.entry.modalities.input, ['text', 'image']);
  assert.equal(mapped.entry.family, 'fam');
  assert.equal(mapped.entry.knowledge_cutoff, '2025-01');
  assert.equal(mapped.entry.open_weights, false);
  assert.equal(mapped.entry.context_window, 1000);
  assert.equal(mapped.entry.pricing.input_per_1m, 1);
  assert.equal(mapped.entry.verification.source, 'provider_catalog');
  assert.match(mapped.entry.verification.notes, /PT-ME-002/);
});

test('buildCandidates allowlists baseline ids; skips openrouter', () => {
  const report = buildCandidates(SNIPPET, ['zhipu', 'openai'], { verifiedAt: '2026-07-24' });
  assert.ok(report.providers.zhipu);
  assert.ok(report.providers.openai);
  assert.equal(report.providers.openrouter, undefined);
  assert.ok(report.skipped_outside_allowlist_count >= 1);
  assert.ok(report.providers.zhipu.models['glm-fixture']);
  assert.equal(
    report.providers.zhipu.models['glm-vision-fixture'].modalities.input.includes('bogus'),
    false,
  );
  assert.equal(report.meta.not_sot, true);
  assert.equal(report.meta.no_dist_write, true);
});

test('diffAgainstManifest finds missing ids', () => {
  const report = buildCandidates(SNIPPET, ['openai'], { verifiedAt: '2026-07-24' });
  const d = diffAgainstManifest(report.providers.openai, { 'gpt-4o': {} });
  assert.ok(d.missing_in_manifest.includes('gpt-fixture-mini'));
  assert.ok(d.only_in_manifest.includes('gpt-4o'));
});

test('PROVIDER_ID_ALIASES maps baichuan-ai / yi / baidu synonyms', () => {
  assert.equal(resolveProviderId('baichuan-ai'), 'baichuan');
  assert.equal(resolveProviderId('01-ai'), 'yi');
  assert.equal(resolveProviderId('lingyiwanwu'), 'yi');
  assert.equal(resolveProviderId('qianfan'), 'baidu');
  assert.equal(resolveProviderId('volcengine'), 'doubao');
  assert.equal(resolveProviderId('jina-ai'), 'jina');
});

test('PROVIDER_SLICE_ROUTES maps hunyuan-* from tencent-coding-plan only', () => {
  const report = buildCandidates(SNIPPET, ['hunyuan', 'baichuan', 'yi'], {
    verifiedAt: '2026-07-25',
  });
  assert.ok(report.providers.hunyuan);
  assert.ok(report.providers.hunyuan.models['hunyuan-fixture']);
  assert.equal(report.providers.hunyuan.models['glm-should-not-map'], undefined);
  assert.ok(report.providers.baichuan.models['Baichuan-fixture']);
  assert.ok(report.meta.allowlist_unmatched.includes('yi'));
  assert.ok(
    report.meta.slice_routes_applied.some((s) => s.includes('tencent-coding-plan→hunyuan')),
  );
});
