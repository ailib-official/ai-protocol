#!/usr/bin/env node

/**
 * Release gate evaluator for multimodal rollout.
 * 多模态发布门禁评估脚本。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = join(ROOT, 'reports', 'release-gates');
const DEFAULT_INPUT = join(ROOT, 'scripts', 'release-gate-input.example.json');

function parseArgs() {
  const inputFlag = process.argv.find((arg) => arg.startsWith('--input='));
  return {
    inputPath: inputFlag ? resolve(process.cwd(), inputFlag.slice('--input='.length)) : DEFAULT_INPUT,
  };
}

function loadInput(path) {
  if (!existsSync(path)) {
    throw new Error(`Release gate input file not found: ${path}`);
  }
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}

function evaluateGate(input) {
  const checks = [
    {
      key: 'p0-coverage',
      pass: (input.coverage?.actual ?? 0) >= (input.coverage?.target ?? 0),
      detail: `coverage.actual=${input.coverage?.actual} target=${input.coverage?.target}`,
      severity: 'critical',
    },
    {
      key: 'compliance-pass-rate',
      pass: (input.compliance?.pass_rate ?? 0) >= (input.compliance?.target_pass_rate ?? 1),
      detail: `compliance.pass_rate=${input.compliance?.pass_rate} target=${input.compliance?.target_pass_rate}`,
      severity: 'critical',
    },
    {
      key: 'runtime-stability',
      pass: (input.stability?.error_rate ?? 1) <= (input.stability?.max_error_rate ?? 0),
      detail: `stability.error_rate=${input.stability?.error_rate} max=${input.stability?.max_error_rate}`,
      severity: 'high',
    },
    {
      key: 'rollback-drill',
      pass: Boolean(input.rollback?.drill_passed),
      detail: `rollback.drill_passed=${input.rollback?.drill_passed}`,
      severity: 'high',
    },
    {
      key: 'docs-sync',
      pass: Boolean(input.docs?.updated),
      detail: `docs.updated=${input.docs?.updated}`,
      severity: 'medium',
    },
  ];

  const failed = checks.filter((c) => !c.pass);
  const status = failed.some((c) => c.severity === 'critical' || c.severity === 'high') ? 'blocked' : 'pass';

  return {
    timestamp: new Date().toISOString(),
    status,
    checks,
    failed_checks: failed,
    gate_reason: failed.length ? `Failed checks: ${failed.map((c) => c.key).join(', ')}` : 'All checks passed',
  };
}

function writeReport(report) {
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  const ts = report.timestamp.replace(/[:.]/g, '-');
  const path = join(REPORT_DIR, `release-gate-${ts}.json`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return path;
}

function main() {
  const args = parseArgs();
  const input = loadInput(args.inputPath);
  const report = evaluateGate(input);
  const reportPath = writeReport(report);

  console.log('== AI-Protocol Release Gate ==');
  console.log(`Input: ${args.inputPath}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Status: ${report.status}`);
  for (const check of report.checks) {
    console.log(`- [${check.pass ? 'PASS' : 'FAIL'}] ${check.key} :: ${check.detail}`);
  }

  process.exit(report.status === 'pass' ? 0 : 1);
}

main();
