#!/usr/bin/env node

/**
 * Static linter for compliance test case YAML files (PT-073h-R3).
 * 合规用例静态校验：schema + fixture 引用 + 最小用例数。
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const CASES_DIR = join(ROOT, 'tests', 'compliance', 'cases');
const FIXTURES_DIR = join(ROOT, 'tests', 'compliance', 'fixtures');
const SCHEMA_PATH = join(ROOT, 'tests', 'compliance', 'schema.json');
const MIN_CASE_COUNT = 40;

function walkYamlFiles(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkYamlFiles(full, acc);
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      acc.push(full);
    }
  }
  return acc;
}

function loadSchemaValidator() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
  delete schema.$schema;
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    strictSchema: false,
  });
  addFormats(ajv);
  return ajv.compile(schema);
}

function parseDocuments(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  return yaml.loadAll(raw).filter((doc) => doc && typeof doc === 'object');
}

function fixtureExists(manifestPath) {
  const rel = manifestPath.replace(/^fixtures\//, '');
  return existsSync(join(FIXTURES_DIR, rel));
}

function main() {
  const validate = loadSchemaValidator();
  const files = walkYamlFiles(CASES_DIR);
  const errors = [];
  let caseCount = 0;

  if (files.length === 0) {
    console.error(`No compliance case files under ${CASES_DIR}`);
    process.exit(1);
  }

  for (const file of files) {
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    let docs;
    try {
      docs = parseDocuments(file);
    } catch (e) {
      errors.push(`${rel}: YAML parse error — ${e.message}`);
      continue;
    }

    for (const [index, doc] of docs.entries()) {
      caseCount += 1;
      const label = `${rel}#${index + 1}`;

      if (!validate(doc)) {
        const detail = (validate.errors ?? [])
          .map((err) => `${err.instancePath || '/'} ${err.message}`)
          .join('; ');
        errors.push(`${label}: schema — ${detail}`);
      }

      const manifestPath = doc.setup?.manifest_path;
      if (manifestPath?.startsWith('fixtures/') && !fixtureExists(manifestPath)) {
        errors.push(`${label}: missing fixture ${manifestPath}`);
      }

      if (doc.expected?.error_name && doc.expected?.error_type) {
        errors.push(`${label}: use error_code/error_type consistently (not error_name + error_type)`);
      }
    }
  }

  if (caseCount < MIN_CASE_COUNT) {
    errors.push(`case count ${caseCount} < minimum ${MIN_CASE_COUNT}`);
  }

  console.log('== Compliance case linter ==');
  console.log(`Files: ${files.length}, cases: ${caseCount}`);

  if (errors.length > 0) {
    console.error(`FAILED (${errors.length}):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('PASS: all compliance cases validated');
}

main();
