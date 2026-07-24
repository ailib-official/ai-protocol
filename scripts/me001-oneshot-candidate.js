#!/usr/bin/env node
/**
 * PT-ME-002 — One-shot models.dev → ME-001 candidate report (non-SoT).
 *
 * Reads a **local** api.json dump. Never fetches at runtime in products.
 * Never writes dist/. Optional --write-candidates only emits advisory files
 * under an explicit directory.
 *
 * Usage:
 *   node scripts/me001-oneshot-candidate.js --input path/to/api.json
 *   node scripts/me001-oneshot-candidate.js --input scripts/fixtures/me001-oneshot-snippet.json --compare-v2
 *   node scripts/me001-oneshot-candidate.js --input api.json --providers openai,zhipu --out report.md --json out.json
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import {
  buildCandidates,
  diffAgainstManifest,
  renderMarkdownReport,
  resolveProviderId,
} from './lib/me001-oneshot-map.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const V2_PROVIDERS = join(ROOT, 'v2', 'providers');

function usage() {
  console.log(`PT-ME-002 oneshot candidate pipeline (advisory; not SoT)

Usage:
  node scripts/me001-oneshot-candidate.js --input <api.json> [options]

Options:
  --input <path>           Local models.dev-style dump (required)
  --providers <a,b,c>      Allowlist of ai-protocol ids (default: all v2 ai_provider)
  --compare-v2             Diff candidate model ids vs v2/providers/*.yaml metadata.models
  --out <report.md>        Write markdown report
  --json <out.json>        Write full candidate JSON
  --write-candidates <dir> Write per-provider candidate YAML fragments (NOT dist/)
  --verified-at <YYYY-MM-DD>
  --help

Non-goals: no cron, no product runtime fetch, no auto-merge into dist/.
`);
}

function parseArgs(argv) {
  const opts = {
    input: null,
    providers: null,
    compareV2: false,
    out: null,
    json: null,
    writeCandidates: null,
    verifiedAt: new Date().toISOString().slice(0, 10),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return { help: true };
    if (a === '--compare-v2') opts.compareV2 = true;
    else if (a === '--input') opts.input = argv[++i];
    else if (a === '--providers') opts.providers = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--json') opts.json = argv[++i];
    else if (a === '--write-candidates') opts.writeCandidates = argv[++i];
    else if (a === '--verified-at') opts.verifiedAt = argv[++i];
    else throw new Error(`Unknown arg: ${a}`);
  }
  return opts;
}

function loadBaselineAllowlist() {
  const ids = [];
  for (const name of readdirSync(V2_PROVIDERS)) {
    if (!name.endsWith('.yaml')) continue;
    const doc = yaml.load(readFileSync(join(V2_PROVIDERS, name), 'utf8'));
    if (doc?.category === 'ai_provider' && doc?.id) ids.push(doc.id);
  }
  return ids.sort();
}

function loadManifestModels(protocolId) {
  const path = join(V2_PROVIDERS, `${protocolId}.yaml`);
  if (!existsSync(path)) return null;
  const doc = yaml.load(readFileSync(path, 'utf8'));
  return doc?.metadata?.models || {};
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    usage();
    process.exit(0);
  }
  if (!opts.input) {
    usage();
    console.error('Error: --input is required (local dump path; no network fetch).');
    process.exit(2);
  }

  const inputPath = resolve(opts.input);
  if (!existsSync(inputPath)) {
    console.error(`Error: input not found: ${inputPath}`);
    process.exit(2);
  }

  const apiJson = JSON.parse(readFileSync(inputPath, 'utf8'));
  const allowlist = opts.providers
    ? opts.providers.split(',').map((s) => s.trim()).filter(Boolean)
    : loadBaselineAllowlist();

  const report = buildCandidates(apiJson, allowlist, { verifiedAt: opts.verifiedAt });

  const diffs = {};
  if (opts.compareV2) {
    for (const pid of Object.keys(report.providers)) {
      diffs[pid] = diffAgainstManifest(report.providers[pid], loadManifestModels(pid));
    }
  }

  const md = renderMarkdownReport(report, diffs);
  if (opts.out) {
    writeFileSync(resolve(opts.out), md, 'utf8');
    console.error(`Wrote markdown: ${opts.out}`);
  } else {
    console.log(md);
  }

  if (opts.json) {
    const payload = { ...report, diffs: opts.compareV2 ? diffs : undefined };
    writeFileSync(resolve(opts.json), JSON.stringify(payload, null, 2), 'utf8');
    console.error(`Wrote JSON: ${opts.json}`);
  }

  if (opts.writeCandidates) {
    const dir = resolve(opts.writeCandidates);
    if (dir.replace(/\\/g, '/').includes('/dist/') || dir.endsWith(`${join('dist')}`)) {
      console.error('Refusing to write under dist/ (ARCH-005 / PT-ME-002 non-goal).');
      process.exit(3);
    }
    mkdirSync(dir, { recursive: true });
    for (const [pid, block] of Object.entries(report.providers)) {
      const frag = {
        _pt_me_002: {
          advisory: true,
          not_sot: true,
          protocol_id: pid,
          models_dev_id: block.models_dev_id,
        },
        metadata: { models: block.models },
      };
      const file = join(dir, `${pid}.candidate.yaml`);
      writeFileSync(file, yaml.dump(frag, { lineWidth: 100, noRefs: true }), 'utf8');
    }
    console.error(`Wrote candidate fragments under: ${dir}`);
  }

  // Resolve sanity: show alias examples when verbose env set
  if (process.env.ME001_ONESHOT_DEBUG) {
    console.error('alias zhipuai→', resolveProviderId('zhipuai'));
  }
}

main();
