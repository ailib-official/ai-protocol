#!/usr/bin/env node
/**
 * PT-ARCH-001/002/003 — validate Architecture fixtures + dist authority block.
 *
 * Run after `npm run build` so dist/index.json exists (CI order: build then validate:arch).
 */
import { existsSync, readFileSync } from 'fs';
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

const EXPECTED_AUTHORITY = {
  lts_wire: 'v1',
  evolution: 'v2',
  sandbox: 'v2-alpha',
  production_default: 'v1',
  latest_means: 'evolution_tip_not_production_default',
};

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

const indexPath = join(ROOT, 'dist', 'index.json');
if (!existsSync(indexPath)) {
  failed += 1;
  console.error(
    'FAIL dist/index.json missing — run `npm run build` before validate:arch',
  );
} else {
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const authority = index.authority;
  let authorityFailed = 0;

  if (!authority || typeof authority !== 'object') {
    authorityFailed += 1;
    console.error('FAIL dist/index.json: missing authority object');
  } else {
    for (const [key, expected] of Object.entries(EXPECTED_AUTHORITY)) {
      if (authority[key] !== expected) {
        authorityFailed += 1;
        console.error(
          `FAIL dist/index.json authority.${key}: got ${JSON.stringify(authority[key])}, expected ${JSON.stringify(expected)}`,
        );
      }
    }
  }

  if (index.latest !== 'v2') {
    authorityFailed += 1;
    console.error(
      `FAIL dist/index.json latest: got ${JSON.stringify(index.latest)}, expected "v2" (evolution tip)`,
    );
  }

  if (authorityFailed === 0) {
    console.log(
      'OK   dist/index.json authority: production_default=v1, latest=v2 (evolution tip)',
    );
  }
  failed += authorityFailed;
}

process.exit(failed === 0 ? 0 : 1);
