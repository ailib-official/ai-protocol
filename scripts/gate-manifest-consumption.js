#!/usr/bin/env node

/**
 * Cross-repo manifest consumption gate (Wave-2 PT-025).
 * 跨仓清单消费门禁脚本（PT-025）。
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = join(ROOT, 'reports', 'manifest-gates');

const DEFAULT_RUNTIME_ROOTS = [
  resolve(ROOT, '..'),
  resolve(ROOT, '../rustapp'),
];

function resolveRuntimeDir(envKey, folderName) {
  if (process.env[envKey]) {
    return resolve(process.env[envKey]);
  }
  for (const root of DEFAULT_RUNTIME_ROOTS) {
    const candidate = join(root, folderName);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return resolve(ROOT, `../${folderName}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const reportOnly = args.includes('--report-only');
  const outputFlag = args.find((arg) => arg.startsWith('--output='));
  const rustFlag = args.find((arg) => arg.startsWith('--rust-dir='));
  const pythonFlag = args.find((arg) => arg.startsWith('--python-dir='));
  const tsFlag = args.find((arg) => arg.startsWith('--ts-dir='));
  const skipMissing =
    args.includes('--skip-missing-runtimes') ||
    process.env.AI_PROTOCOL_SKIP_MISSING_RUNTIMES === '1';

  return {
    reportOnly,
    skipMissing,
    outputPath: outputFlag ? resolve(process.cwd(), outputFlag.slice('--output='.length)) : null,
    rustDir: rustFlag
      ? resolve(process.cwd(), rustFlag.slice('--rust-dir='.length))
      : resolveRuntimeDir('AI_LIB_RUST_DIR', 'ai-lib-rust'),
    pythonDir: pythonFlag
      ? resolve(process.cwd(), pythonFlag.slice('--python-dir='.length))
      : resolveRuntimeDir('AI_LIB_PYTHON_DIR', 'ai-lib-python'),
    tsDir: tsFlag
      ? resolve(process.cwd(), tsFlag.slice('--ts-dir='.length))
      : resolveRuntimeDir('AI_LIB_TS_DIR', 'ai-lib-ts'),
  };
}

function runCommand(label, command, cwd, { skipMissing = false } = {}) {
  const start = Date.now();
  if (!existsSync(cwd)) {
    if (skipMissing) {
      return {
        label,
        command,
        cwd,
        pass: true,
        skipped: true,
        exit_code: 0,
        elapsed_ms: 0,
        stdout: '',
        stderr: `Skipped missing runtime directory: ${cwd}`,
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
    maxBuffer: 1024 * 1024 * 10,
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

function writeReport(report, outputPath) {
  if (outputPath) {
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
    return outputPath;
  }
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  const ts = report.timestamp.replace(/[:.]/g, '-');
  const file = join(REPORT_DIR, `manifest-gate-${ts}.json`);
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
      policy: 'required',
    },
    {
      label: 'rust-manifest-consumption',
      command: 'cargo test --test generative_manifest_consumption --features multimodal',
      cwd: args.rustDir,
      policy: 'required',
    },
    {
      label: 'python-manifest-consumption',
      command: 'python3 -m pytest tests/integration/test_generative_manifest_consumption.py',
      cwd: args.pythonDir,
      policy: 'required',
    },
    {
      label: 'ts-manifest-consumption',
      command: 'npm run test -- tests/protocol-v2.test.ts',
      cwd: args.tsDir,
      policy: 'required',
    },
  ];

  const results = checks.map((check) =>
    runCommand(check.label, check.command, check.cwd, {
      skipMissing: args.skipMissing && check.cwd !== ROOT,
    }),
  );

  const failed = results.filter((item) => !item.pass).map((item) => ({
    id: item.label,
    owner: 'TBD',
    eta: 'TBD',
    rollback: 'Run in report-only mode and keep previous stable release path',
    detail: `exit_code=${item.exit_code}`,
  }));

  const report = {
    timestamp: new Date().toISOString(),
    gate_id: 'pt025-manifest-consumption',
    mode: args.reportOnly ? 'report-only' : 'required',
    summary: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass).length,
      status: failed.length === 0 ? 'pass' : (args.reportOnly ? 'report-only-failed' : 'blocked'),
    },
    checks: results,
    failure_annotations: failed,
  };

  const reportPath = writeReport(report, args.outputPath);
  console.log('== AI-Protocol Manifest Consumption Gate ==');
  console.log(`Mode: ${report.mode}`);
  console.log(`Report: ${reportPath}`);
  for (const item of results) {
    console.log(`- [${item.pass ? 'PASS' : 'FAIL'}] ${item.label} (${item.elapsed_ms}ms)`);
  }

  if (report.summary.failed > 0 && !args.reportOnly) {
    process.exit(1);
  }
}

main();

