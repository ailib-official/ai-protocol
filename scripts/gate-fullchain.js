#!/usr/bin/env node

/**
 * Fullchain governance gate runner.
 * 全链路治理门禁统一入口。
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = join(ROOT, 'reports', 'fullchain-gates');

function run(label, command) {
  const started = Date.now();
  const result = spawnSync(command, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 16,
  });
  return {
    label,
    command,
    pass: result.status === 0,
    exit_code: result.status ?? -1,
    elapsed_ms: Date.now() - started,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function writeReport(report) {
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  const ts = report.timestamp.replace(/[:.]/g, '-');
  const file = join(REPORT_DIR, `fullchain-gate-${ts}.json`);
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return file;
}

function main() {
  const reportOnly = process.argv.includes('--report-only');
  const checks = [
    { label: 'drift-check', command: `node scripts/drift-detect.js${reportOnly ? ' --report-only' : ''}` },
    {
      label: 'manifest-consumption-gate',
      command: `node scripts/gate-manifest-consumption.js${reportOnly ? ' --report-only' : ''}`,
    },
    {
      label: 'compliance-matrix-gate',
      command: `node scripts/gate-compliance-matrix.js${reportOnly ? ' --report-only' : ''}`,
    },
    { label: 'release-gate', command: `node scripts/release-gate.js${reportOnly ? ' --report-only' : ''}` },
  ];

  const results = checks.map((item) => run(item.label, item.command));
  const failed = results.filter((r) => !r.pass);
  const report = {
    timestamp: new Date().toISOString(),
    mode: reportOnly ? 'report-only' : 'required',
    gate_id: 'fullchain-governance-gate',
    summary: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: failed.length,
      status: failed.length === 0 ? 'pass' : reportOnly ? 'report-only-failed' : 'blocked',
    },
    checks: results,
  };

  const reportPath = writeReport(report);
  console.log('== AI-Protocol Fullchain Gate ==');
  console.log(`Mode: ${report.mode}`);
  console.log(`Report: ${reportPath}`);
  for (const item of results) {
    console.log(`- [${item.pass ? 'PASS' : 'FAIL'}] ${item.label} (${item.elapsed_ms}ms)`);
  }

  if (failed.length > 0 && !reportOnly) {
    process.exit(1);
  }
}

main();

