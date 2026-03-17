#!/usr/bin/env node

/**
 * Capability profile boundary validation (staged IOS + IOSPC).
 * Generates a factual evidence report to support staged governance rollout.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import Ajv2020 from "ajv/dist/2020.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, "..");

const schemaPath = join(ROOT_DIR, "schemas", "v2", "capability-profile.json");
const reportDir = join(ROOT_DIR, "reports", "report-evidence-gates");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = join(
  reportDir,
  `capability-profile-staged-boundary-${timestamp}.json`
);

const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const cases = [
  {
    id: "cp-001-minimal-empty-object",
    expectedValid: false,
    payload: {},
  },
  {
    id: "cp-001b-minimal-inputs-only",
    expectedValid: true,
    payload: {
      phase: "ios_v1",
      inputs: { modalities: ["text"] }
    }
  },
  {
    id: "cp-002-valid-profile",
    expectedValid: true,
    payload: {
      phase: "ios_v1",
      inputs: { modalities: ["text", "image"], max_references: 12, max_payload_mb: 128 },
      outcomes: { types: ["structured_json", "tool_call_sequence"], quality_tier: "standard" },
      systems: { requires: ["mcp", "search"] }
    },
  },
  {
    id: "cp-003-inputs-max-references-overflow",
    expectedValid: false,
    payload: {
      phase: "ios_v1",
      inputs: { modalities: ["text"], max_references: 65 },
    },
  },
  {
    id: "cp-004-unknown-top-level-field",
    expectedValid: false,
    payload: {
      unknown_field: true,
    },
  },
  {
    id: "cp-005-unknown-modality",
    expectedValid: false,
    payload: {
      phase: "ios_v1",
      inputs: { modalities: ["binary_blob"] },
    },
  },
  {
    id: "cp-006-process-not-enabled-in-ios-phase",
    expectedValid: false,
    payload: {
      phase: "ios_v1",
      process: { mode: "async" },
    },
  },
  {
    id: "cp-007-contract-not-enabled-in-ios-phase",
    expectedValid: false,
    payload: {
      phase: "ios_v1",
      contract: { safety_rules_ref: "safety.v1" },
    },
  },
  {
    id: "cp-008-iospc-valid-with-process-and-contract",
    expectedValid: true,
    payload: {
      phase: "iospc_v1",
      inputs: { modalities: ["text"] },
      process: { mode: "async", supports_callbacks: true, max_async_jobs: 128 },
      contract: { safety_profile: "standard", cost_class: "medium", error_model_ref: "errors.v2" },
    },
  },
  {
    id: "cp-009-iospc-missing-process-contract",
    expectedValid: false,
    payload: {
      phase: "iospc_v1",
      inputs: { modalities: ["text"] },
    },
  },
  {
    id: "cp-010-iospc-missing-ios-dimensions",
    expectedValid: false,
    payload: {
      phase: "iospc_v1",
      process: { mode: "sync" },
    },
  },
];

const results = cases.map((item) => {
  const ok = validate(item.payload);
  const actualValid = Boolean(ok);
  const pass = actualValid === item.expectedValid;
  return {
    id: item.id,
    expected_valid: item.expectedValid,
    actual_valid: actualValid,
    pass,
    errors: validate.errors ?? [],
  };
});

const summary = {
  total: results.length,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).length,
};

const report = {
  timestamp: new Date().toISOString(),
  gate_id: "capability-profile-staged-boundary",
  mode: "report-only",
  schema: "schemas/v2/capability-profile.json",
  summary,
  checks: results,
};

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

console.log(`Capability profile IOS boundary report written: ${reportPath}`);
console.log(
  `Summary: total=${summary.total}, passed=${summary.passed}, failed=${summary.failed}`
);

if (summary.failed > 0) {
  process.exit(1);
}
