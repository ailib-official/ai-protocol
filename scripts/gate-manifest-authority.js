#!/usr/bin/env node

/**
 * Manifest authority gate (TEST-002 + manifest hygiene).
 * 公共 manifest 权威性门禁：禁止 hiddenpath、应用专属 provenance、部署备注污染协议仓。
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

/** @type {readonly string[]} */
const SCAN_ROOTS = ['v1', 'v2', 'v2-alpha', 'dist'];

/** @type {readonly string[]} */
const V2_VERIFICATION_SOURCE_ENUM = [
  'official_documentation',
  'api_probe',
  'compliance_registry',
  'provider_catalog',
];

/** @type {readonly string[]} */
const FORBIDDEN_VERIFICATION_SOURCES = [
  'eos',
  'velaclaw-trial',
  'velaclaw',
  'gateway',
  'prism',
  'spiderswitch',
  'zerospider',
  'aidebate',
];

/** @type {readonly RegExp[]} */
const FORBIDDEN_URL_PATTERNS = [
  /https?:\/\/github\.com\/hiddenpath\//i,
  /https?:\/\/raw\.githubusercontent\.com\/hiddenpath\//i,
  /https?:\/\/api\.github\.com\/repos\/hiddenpath\//i,
  /\bhiddenpath\//i,
];

/** @type {readonly RegExp[]} */
const FORBIDDEN_NOTE_PATTERNS = [
  /\bPR\s*#\d+/i,
  /\bmain@[0-9a-f]{7,40}\b/i,
  /\bEos\s+default\b/i,
  /\bHK\s+deployment\b/i,
  /\bhiddenpath\b/i,
];

const EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function collectFiles(dir, acc) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, acc);
    } else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) {
      acc.push(full);
    }
  }
}

function isV2ManifestPath(rel) {
  return rel.startsWith('v2/') || rel.startsWith('dist/v2/');
}

/**
 * @param {string} content
 * @param {string} rel
 * @param {{ file: string, line: number | null, rule: string, message: string }[]} violations
 */
function scanContent(content, rel, violations) {
  const lines = content.split(/\r?\n/);
  const v2 = isV2ManifestPath(rel);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    for (const pattern of FORBIDDEN_URL_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: rel,
          line: lineNo,
          rule: 'TEST-002',
          message: `Forbidden URL/org reference (${pattern})`,
        });
      }
    }

    const yamlSource = line.match(/^\s+source:\s*["']?([^"'\s#]+)["']?\s*$/);
    if (yamlSource) {
      const value = yamlSource[1];
      if (FORBIDDEN_VERIFICATION_SOURCES.includes(value)) {
        violations.push({
          file: rel,
          line: lineNo,
          rule: 'MANIFEST-AUTHORITY',
          message: `Forbidden verification.source "${value}"`,
        });
      } else if (v2 && lines.slice(Math.max(0, i - 4), i).some((l) => /verification:/.test(l))) {
        if (!V2_VERIFICATION_SOURCE_ENUM.includes(value)) {
          violations.push({
            file: rel,
            line: lineNo,
            rule: 'MANIFEST-AUTHORITY',
            message: `v2 verification.source must be one of: ${V2_VERIFICATION_SOURCE_ENUM.join(', ')}`,
          });
        }
      }
    }

    const jsonSource = line.match(/"source":\s*"([^"]+)"/);
    if (jsonSource && v2) {
      const value = jsonSource[1];
      if (FORBIDDEN_VERIFICATION_SOURCES.includes(value)) {
        violations.push({
          file: rel,
          line: lineNo,
          rule: 'MANIFEST-AUTHORITY',
          message: `Forbidden verification.source "${value}"`,
        });
      } else if (
        lines.slice(Math.max(0, i - 6), i + 1).some((l) => /"verification"/.test(l)) &&
        !V2_VERIFICATION_SOURCE_ENUM.includes(value)
      ) {
        violations.push({
          file: rel,
          line: lineNo,
          rule: 'MANIFEST-AUTHORITY',
          message: `v2 verification.source must be one of: ${V2_VERIFICATION_SOURCE_ENUM.join(', ')}`,
        });
      }
    }

    const notesMatch = line.match(/notes:\s*["']([^"']+)["']/);
    if (notesMatch) {
      for (const pattern of FORBIDDEN_NOTE_PATTERNS) {
        if (pattern.test(notesMatch[1])) {
          violations.push({
            file: rel,
            line: lineNo,
            rule: 'MANIFEST-AUTHORITY',
            message: `Deployment-specific verification.notes forbidden`,
          });
        }
      }
    }

    const jsonNotes = line.match(/"notes":\s*"([^"]+)"/);
    if (jsonNotes) {
      for (const pattern of FORBIDDEN_NOTE_PATTERNS) {
        if (pattern.test(jsonNotes[1])) {
          violations.push({
            file: rel,
            line: lineNo,
            rule: 'MANIFEST-AUTHORITY',
            message: `Deployment-specific verification.notes forbidden`,
          });
        }
      }
    }
  }
}

function main() {
  /** @type {string[]} */
  const files = [];
  for (const root of SCAN_ROOTS) {
    collectFiles(join(ROOT, root), files);
  }

  /** @type {{ file: string, line: number | null, rule: string, message: string }[]} */
  const violations = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    scanContent(readFileSync(file, 'utf8'), rel, violations);
  }

  console.log('== Manifest Authority Gate ==');
  console.log(`Scanned ${files.length} files under ${SCAN_ROOTS.join(', ')}`);

  if (violations.length === 0) {
    console.log('PASS — no manifest authority violations');
    process.exit(0);
  }

  console.log(`FAIL — ${violations.length} violation(s):`);
  for (const v of violations) {
    const loc = v.line != null ? `${v.file}:${v.line}` : v.file;
    console.log(`  [${v.rule}] ${loc}: ${v.message}`);
  }
  process.exit(1);
}

main();
