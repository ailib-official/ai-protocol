#!/usr/bin/env node
/**
 * PT-ARCH-001…005(+b) — validate Architecture fixtures + dist authority +
 * provider-identity registry gates.
 *
 * Run after `npm run build` so dist/index.json exists (CI order: build then validate:arch).
 *
 * Identity model (no dual wire keys): primary `id` + optional `aliases[]`.
 * Registry gates forbid silent dual-identity without an alias map.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

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
  {
    schema: 'schemas/v2/provider-identity.json',
    data: 'v2/provider-identity.fixture.json',
  },
];

const EXPECTED_AUTHORITY = {
  lts_wire: 'v1',
  evolution: 'v2',
  sandbox: 'v2-alpha',
  production_default: 'v1',
  latest_means: 'evolution_tip_not_production_default',
};

const PROVIDER_TREES = [
  { name: 'v1', dir: join(ROOT, 'v1', 'providers') },
  { name: 'v2', dir: join(ROOT, 'v2', 'providers') },
  { name: 'v2-alpha', dir: join(ROOT, 'v2-alpha', 'providers') },
];

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

let failed = 0;

function loadProviderTree(treeName, dir) {
  if (!existsSync(dir)) {
    return { entries: [], loadErrors: [`tree directory missing: ${dir}`] };
  }
  const entries = [];
  const loadErrors = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue;
    const filePath = join(dir, name);
    let doc;
    try {
      doc = yaml.load(readFileSync(filePath, 'utf8'));
    } catch (e) {
      loadErrors.push(`${treeName}/${name}: YAML parse error: ${e.message}`);
      continue;
    }
    if (!doc || typeof doc !== 'object') {
      loadErrors.push(`${treeName}/${name}: empty or non-object manifest`);
      continue;
    }
    const id = doc.id;
    const aliases = Array.isArray(doc.aliases) ? doc.aliases : [];
    const stem = basename(name, name.endsWith('.yml') ? '.yml' : '.yaml');
    entries.push({ treeName, name, stem, id, aliases, filePath });
  }
  return { entries, loadErrors };
}

/**
 * Registry gates (PT-ARCH-005b):
 * - filename stem MUST equal manifest `id`
 * - `id` unique within tree
 * - alias MUST NOT equal own `id`
 * - alias MUST NOT equal another primary `id` in the same tree
 * - alias MUST NOT be claimed by two different primaries in the same tree
 * - no second primary file whose stem/id is an alias of another primary
 */
function validateProviderRegistry(treeName, dir) {
  let gateFailed = 0;
  const { entries, loadErrors } = loadProviderTree(treeName, dir);
  for (const err of loadErrors) {
    gateFailed += 1;
    console.error(`FAIL ${err}`);
  }
  if (entries.length === 0 && loadErrors.length === 0) {
    console.error(`FAIL ${treeName}: no provider manifests found`);
    return 1;
  }

  const byId = new Map();
  const aliasOwner = new Map(); // alias -> primary id

  for (const e of entries) {
    if (typeof e.id !== 'string' || !e.id) {
      gateFailed += 1;
      console.error(`FAIL ${treeName}/${e.name}: missing or invalid id`);
      continue;
    }
    if (e.stem !== e.id) {
      gateFailed += 1;
      console.error(
        `FAIL ${treeName}/${e.name}: filename stem "${e.stem}" MUST equal id "${e.id}"`,
      );
    }
    if (byId.has(e.id)) {
      gateFailed += 1;
      console.error(
        `FAIL ${treeName}: duplicate primary id "${e.id}" in ${byId.get(e.id)} and ${e.name}`,
      );
    } else {
      byId.set(e.id, e.name);
    }

    const seenLocal = new Set();
    for (const alias of e.aliases) {
      if (typeof alias !== 'string' || !alias) {
        gateFailed += 1;
        console.error(`FAIL ${treeName}/${e.name}: invalid aliases entry`);
        continue;
      }
      if (seenLocal.has(alias)) {
        gateFailed += 1;
        console.error(
          `FAIL ${treeName}/${e.name}: duplicate alias "${alias}" on same manifest`,
        );
        continue;
      }
      seenLocal.add(alias);
      if (alias === e.id) {
        gateFailed += 1;
        console.error(
          `FAIL ${treeName}/${e.name}: alias "${alias}" MUST NOT equal own id`,
        );
      }
      if (aliasOwner.has(alias) && aliasOwner.get(alias) !== e.id) {
        gateFailed += 1;
        console.error(
          `FAIL ${treeName}: alias "${alias}" claimed by both id "${aliasOwner.get(alias)}" and id "${e.id}"`,
        );
      } else {
        aliasOwner.set(alias, e.id);
      }
    }
  }

  // Alias must not collide with another primary id (after full id set known).
  for (const e of entries) {
    if (typeof e.id !== 'string') continue;
    for (const alias of e.aliases) {
      if (typeof alias !== 'string') continue;
      if (byId.has(alias) && byId.get(alias) !== e.name) {
        gateFailed += 1;
        console.error(
          `FAIL ${treeName}/${e.name}: alias "${alias}" collides with primary id in ${byId.get(alias)} (publish alias map on the primary; do not invent a second id)`,
        );
      }
    }
  }

  // No file whose stem is an alias of another primary (silent dual identity).
  for (const e of entries) {
    if (aliasOwner.has(e.stem) && aliasOwner.get(e.stem) !== e.id) {
      gateFailed += 1;
      console.error(
        `FAIL ${treeName}/${e.name}: stem/id is an alias of primary "${aliasOwner.get(e.stem)}" — remove this primary or fold into aliases`,
      );
    }
  }

  if (gateFailed === 0) {
    console.log(
      `OK   provider registry gates: ${treeName} (${entries.length} manifests)`,
    );
  }
  return gateFailed;
}

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

for (const tree of PROVIDER_TREES) {
  failed += validateProviderRegistry(tree.name, tree.dir);
}

// PT-ARCH-005: Gemini API identity — canonical gemini + alias google on v2 (Option A).
{
  let identityFailed = 0;
  const googlePath = join(ROOT, 'v2', 'providers', 'google.yaml');
  const geminiV2Path = join(ROOT, 'v2', 'providers', 'gemini.yaml');

  if (existsSync(googlePath)) {
    identityFailed += 1;
    console.error(
      'FAIL v2/providers/google.yaml must not exist (canonical id is gemini; google is alias)',
    );
  }

  if (!existsSync(geminiV2Path)) {
    identityFailed += 1;
    console.error('FAIL v2/providers/gemini.yaml missing');
  } else {
    const gemini = yaml.load(readFileSync(geminiV2Path, 'utf8'));
    if (!gemini || gemini.id !== 'gemini') {
      identityFailed += 1;
      console.error(
        `FAIL v2/providers/gemini.yaml id: got ${JSON.stringify(gemini && gemini.id)}, expected "gemini"`,
      );
    }
    const aliases = Array.isArray(gemini.aliases) ? gemini.aliases : [];
    if (!aliases.includes('google')) {
      identityFailed += 1;
      console.error(
        'FAIL v2/providers/gemini.yaml aliases must include "google" (PT-ARCH-005 Option A)',
      );
    }
  }

  const map = JSON.parse(
    readFileSync(join(ROOT, 'v2', 'provider-identity.fixture.json'), 'utf8'),
  );
  if (map.canonical_id !== 'gemini' || !map.aliases.includes('google')) {
    identityFailed += 1;
    console.error(
      'FAIL provider-identity.fixture.json must set canonical_id=gemini and aliases include google',
    );
  }

  // Sandbox should not reintroduce google as a second primary; prefer alias on gemini.
  const alphaGoogle = join(ROOT, 'v2-alpha', 'providers', 'google.yaml');
  const alphaGemini = join(ROOT, 'v2-alpha', 'providers', 'gemini.yaml');
  if (existsSync(alphaGoogle)) {
    identityFailed += 1;
    console.error(
      'FAIL v2-alpha/providers/google.yaml must not exist (use gemini + aliases)',
    );
  }
  if (existsSync(alphaGemini)) {
    const alpha = yaml.load(readFileSync(alphaGemini, 'utf8'));
    const alphaAliases = Array.isArray(alpha && alpha.aliases)
      ? alpha.aliases
      : [];
    if (!alpha || alpha.id !== 'gemini') {
      identityFailed += 1;
      console.error(
        `FAIL v2-alpha/providers/gemini.yaml id: got ${JSON.stringify(alpha && alpha.id)}, expected "gemini"`,
      );
    }
    if (!alphaAliases.includes('google')) {
      identityFailed += 1;
      console.error(
        'FAIL v2-alpha/providers/gemini.yaml aliases must include "google" (graduation alignment)',
      );
    }
  }

  if (identityFailed === 0) {
    console.log(
      'OK   provider identity: canonical gemini + alias google (PT-ARCH-005 Option A)',
    );
  }
  failed += identityFailed;
}

process.exit(failed === 0 ? 0 : 1);
