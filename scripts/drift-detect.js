#!/usr/bin/env node

/**
 * Drift detector for multimodal P0 execution readiness.
 * 多模态 P0 执行就绪漂移检测脚本。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const V2_PROVIDER_DIR = join(ROOT, 'v2', 'providers');
const FIXTURE_DIR = join(ROOT, 'tests', 'compliance', 'fixtures', 'providers');
const P0_CASE_DIR = join(ROOT, 'tests', 'compliance', 'cases', '01-protocol-loading');
const REPORT_DIR = join(ROOT, 'reports', 'drift');

const P0_REQUIRED = ['openai', 'anthropic', 'google', 'deepseek', 'qwen', 'doubao'];

function readYaml(path) {
  return yaml.load(readFileSync(path, 'utf-8'));
}

function listYamlFilenames(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.yaml'));
}

function listFilesRecursively(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function loadCaseProviderIds(caseDirPath) {
  if (!existsSync(caseDirPath)) return new Set();
  const ids = new Set();
  const caseFiles = listFilesRecursively(caseDirPath).filter((p) => p.endsWith('.yaml'));
  for (const caseFile of caseFiles) {
    const docs = yaml.loadAll(readFileSync(caseFile, 'utf-8'));
    for (const doc of docs) {
      if (!doc || typeof doc !== 'object') continue;
      const expected = doc.expected;
      if (expected && typeof expected === 'object' && typeof expected.provider_id === 'string') {
        ids.add(expected.provider_id);
      }
    }
  }
  return ids;
}

function detectDrift() {
  const providerFiles = listYamlFilenames(V2_PROVIDER_DIR);
  const providers = providerFiles.map((filename) => {
    const path = join(V2_PROVIDER_DIR, filename);
    const data = readYaml(path) || {};
    return {
      id: data.id || filename.replace(/\.yaml$/, ''),
      file: filename,
    };
  });
  const providerIds = new Set(providers.map((p) => p.id));
  const caseProviderIds = loadCaseProviderIds(P0_CASE_DIR);

  const drifts = [];
  for (const pid of P0_REQUIRED) {
    if (!providerIds.has(pid)) {
      drifts.push({ severity: 'critical', type: 'missing-v2-provider', provider: pid });
      continue;
    }

    const v2Fixture = `mock-${pid}-v2.yaml`;
    const legacyFixture = `mock-${pid}.yaml`;
    if (!existsSync(join(FIXTURE_DIR, v2Fixture)) && !existsSync(join(FIXTURE_DIR, legacyFixture))) {
      drifts.push({
        severity: 'high',
        type: 'missing-compliance-fixture',
        provider: pid,
        expected_fixture: `${v2Fixture} | ${legacyFixture}`,
      });
    }

    if (!caseProviderIds.has(pid)) {
      drifts.push({ severity: 'high', type: 'missing-compliance-case', provider: pid, case_dir: P0_CASE_DIR });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      p0_required_count: P0_REQUIRED.length,
      v2_provider_count: providers.length,
      drift_count: drifts.length,
      critical_count: drifts.filter((d) => d.severity === 'critical').length,
      high_count: drifts.filter((d) => d.severity === 'high').length,
    },
    p0_required: P0_REQUIRED,
    providers: providers.map((p) => p.id).sort(),
    drifts,
  };
}

function writeReport(report) {
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  const ts = report.timestamp.replace(/[:.]/g, '-');
  const path = join(REPORT_DIR, `drift-${ts}.json`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return path;
}

function main() {
  const reportOnly = process.argv.includes('--report-only');
  const report = detectDrift();
  report.mode = reportOnly ? 'report-only' : 'required';
  const reportPath = writeReport(report);

  console.log('== AI-Protocol Drift Report ==');
  console.log(`Report: ${reportPath}`);
  console.log(`Drifts: ${report.summary.drift_count}`);
  if (report.drifts.length > 0) {
    for (const drift of report.drifts) {
      console.log(`- [${drift.severity}] ${drift.type} :: ${drift.provider}`);
    }
  } else {
    console.log('No drifts detected for P0 provider readiness.');
  }

  const hasBlocking = report.drifts.some((d) => d.severity === 'critical' || d.severity === 'high');
  if (hasBlocking && !reportOnly) {
    process.exit(1);
  }
  process.exit(0);
}

main();
