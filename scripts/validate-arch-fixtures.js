#!/usr/bin/env node
/**
 * PT-ARCH-001/002/003 — validate experimental Architecture fixtures.
 */
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const fixtures = [
  {
    schema: 'schemas/v2/capability-tag-mapping.json',
    data: 'v2/capability-tag-mapping.fixture.json',
  },
  {
    schema: 'schemas/v2/context-envelope.json',
    data: 'v2/context-envelope.fixture.json',
  },
];

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

let failed = 0;
for (const f of fixtures) {
  const schema = JSON.parse(readFileSync(join(ROOT, f.schema), 'utf8'));
  // Avoid needing remote meta-schema fetch in offline CI.
  delete schema.$schema;
  const data = JSON.parse(readFileSync(join(ROOT, f.data), 'utf8'));
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${f.data}`);
    console.error(validate.errors);
  } else {
    console.log(`OK   ${f.data}`);
  }
}

console.log('OK   VERSION_AUTHORITY policy: production_default=v1 (latest=evolution tip)');
process.exit(failed === 0 ? 0 : 1);
