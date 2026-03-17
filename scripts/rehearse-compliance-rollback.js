#!/usr/bin/env node

/**
 * Compliance gate rollback rehearsal.
 * 负向演练：required 应阻断，report-only 应放行并保留失败证据。
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = join(ROOT, 'reports', 'rollback-rehearsals');
const VALID_MODES = new Set(['required', 'report-only', 'both']);

function runGate(reportOnly) {
  const badTsDir = resolve(ROOT, '../rustapp/ai-lib-ts-not-exists');
  const args = ['scripts/gate-compliance-matrix.js'];
  if (reportOnly) {
    args.push('--report-only');
  }

  const result = spawnSync('node', args, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf-8',
    env: {
      ...process.env,
      AI_LIB_TS_DIR: badTsDir,
    },
  });

  return {
    mode: reportOnly ? 'report-only' : 'required',
    exit_code: result.status ?? -1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function extractReportPath(stdout) {
  const line = stdout
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.startsWith('Report: '));
  return line ? line.replace('Report: ', '').trim() : '';
}

function main() {
  const args = process.argv.slice(2);
  const modeArg = args.find((arg) => arg.startsWith('--mode='));
  const mode = modeArg ? modeArg.replace('--mode=', '').trim() : 'both';
  if (!VALID_MODES.has(mode)) {
    console.error(`Invalid mode: ${mode}. Expected one of: required, report-only, both`);
    process.exit(2);
  }

  const required = mode === 'report-only' ? null : runGate(false);
  const reportOnly = mode === 'required' ? null : runGate(true);

  const requiredReportPath = required ? extractReportPath(required.stdout) : '';
  const reportOnlyReportPath = reportOnly ? extractReportPath(reportOnly.stdout) : '';

  const requiredBlocked = required ? required.exit_code !== 0 : true;
  const reportOnlyPass = reportOnly ? reportOnly.exit_code === 0 : true;

  const summary = {
    mode,
    required_should_block: requiredBlocked,
    report_only_should_pass: reportOnlyPass,
    pass:
      mode === 'both'
        ? requiredBlocked && reportOnlyPass
        : mode === 'required'
          ? requiredBlocked
          : reportOnlyPass,
  };

  const report = {
    timestamp: new Date().toISOString(),
    rehearsal_id: 'compliance-rollback-lane',
    injected_failure: {
      type: 'invalid_runtime_directory',
      env: 'AI_LIB_TS_DIR',
    },
    required: required
      ? {
          ...required,
          report_path: requiredReportPath,
        }
      : null,
    report_only: reportOnly
      ? {
          ...reportOnly,
          report_path: reportOnlyReportPath,
        }
      : null,
    summary,
  };

  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  const ts = report.timestamp.replace(/[:.]/g, '-');
  const outputPath = join(REPORT_DIR, `compliance-rollback-rehearsal-${ts}.json`);
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  console.log('== Compliance Rollback Rehearsal ==');
  console.log(`Report: ${outputPath}`);
  console.log(`Mode: ${mode}`);
  if (required) {
    console.log(`Required blocked: ${requiredBlocked} (exit=${required.exit_code})`);
  }
  if (reportOnly) {
    console.log(`Report-only passed: ${reportOnlyPass} (exit=${reportOnly.exit_code})`);
  }

  if (!summary.pass) {
    process.exit(1);
  }
}

main();
