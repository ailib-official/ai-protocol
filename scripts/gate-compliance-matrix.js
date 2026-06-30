#!/usr/bin/env node

/**
 * Cross-repo compliance matrix gate.
 * 跨仓全量合规矩阵门禁脚本。
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const DEFAULT_RUST_DIR = resolve(ROOT, '../rustapp/ai-lib-rust');
const DEFAULT_PYTHON_DIR = resolve(ROOT, '../rustapp/ai-lib-python');
const DEFAULT_TS_DIR = resolve(ROOT, '../rustapp/ai-lib-ts');
const REPORT_DIR = join(ROOT, 'reports', 'compliance-gates');

function parseArgs() {
  const args = process.argv.slice(2);
  const reportOnly = args.includes('--report-only');
  return {
    reportOnly,
    rustDir: process.env.AI_LIB_RUST_DIR ? resolve(process.env.AI_LIB_RUST_DIR) : DEFAULT_RUST_DIR,
    pythonDir: process.env.AI_LIB_PYTHON_DIR ? resolve(process.env.AI_LIB_PYTHON_DIR) : DEFAULT_PYTHON_DIR,
    tsDir: process.env.AI_LIB_TS_DIR ? resolve(process.env.AI_LIB_TS_DIR) : DEFAULT_TS_DIR,
  };
}

function runCommand(label, command, cwd, { optional = false } = {}) {
  const start = Date.now();
  if (!existsSync(cwd)) {
    if (optional) {
      return {
        label,
        command,
        cwd,
        pass: true,
        skipped: true,
        exit_code: 0,
        elapsed_ms: 0,
        stdout: '',
        stderr: `Skipped (optional): directory not found: ${cwd}`,
      };
    }
    return {
      label,
      command,
      cwd,
      pass: false,
      exit_code: 127,
      elapsed_ms: 0,
      stdout: '',
      stderr: `Directory not found: ${cwd}`,
    };
  }
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 12,
  });
  return {
    label,
    command,
    cwd,
    pass: result.status === 0,
    exit_code: result.status ?? -1,
    elapsed_ms: Date.now() - start,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function writeReport(report) {
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  const ts = report.timestamp.replace(/[:.]/g, '-');
  const file = join(REPORT_DIR, `compliance-gate-${ts}.json`);
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return file;
}

function main() {
  const args = parseArgs();
  const checks = [
    {
      label: 'protocol-validate',
      command: 'npm run validate',
      cwd: ROOT,
    },
    {
      label: 'compliance-cases-lint',
      command: 'npm run validate:compliance',
      cwd: ROOT,
    },
    {
      label: 'rust-compliance',
      command: 'cargo test --test compliance',
      cwd: args.rustDir,
      optional: true,
    },
    {
      label: 'python-compliance',
      command: 'python -m pytest tests/compliance/test_compliance.py',
      cwd: args.pythonDir,
      optional: true,
    },
    {
      label: 'ts-compliance',
      command:
        'npm run test -- tests/compliance-matrix.test.ts tests/retry-policy.compliance.test.ts tests/protocol-loading.compliance.test.ts',
      cwd: args.tsDir,
      optional: true,
    },
  ];

  const results = checks.map((check) =>
    runCommand(check.label, check.command, check.cwd, { optional: check.optional })
  );
  const required = results.filter((item) => !item.skipped);
  const failed = required.filter((item) => !item.pass);
  const report = {
    timestamp: new Date().toISOString(),
    gate_id: 'compliance-matrix-gate',
    mode: args.reportOnly ? 'report-only' : 'required',
    summary: {
      total: results.length,
      required: required.length,
      skipped: results.filter((r) => r.skipped).length,
      passed: required.filter((r) => r.pass).length,
      failed: failed.length,
      status: failed.length === 0 ? 'pass' : args.reportOnly ? 'report-only-failed' : 'blocked',
    },
    checks: results,
    failure_annotations: failed.map((item) => ({
      id: item.label,
      detail: `exit_code=${item.exit_code}`,
      rollback: 'switch to --report-only mode while fixing',
    })),
  };

  const reportPath = writeReport(report);
  console.log('== AI-Protocol Compliance Matrix Gate ==');
  console.log(`Mode: ${report.mode}`);
  console.log(`Report: ${reportPath}`);
  for (const item of results) {
    const tag = item.skipped ? 'SKIP' : item.pass ? 'PASS' : 'FAIL';
    console.log(`- [${tag}] ${item.label} (${item.elapsed_ms}ms)`);
  }

  if (failed.length > 0 && !args.reportOnly) {
    process.exit(1);
  }
}

main();

