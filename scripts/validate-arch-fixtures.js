#!/usr/bin/env node
/**
 * PT-ARCH-001…005(+b/d) + PT-ARCH-007/008 — validate Architecture fixtures,
 * dist authority, provider-identity registry gates, F9 error contract names,
 * and F11 pilot assertions (vocabulary freeze, Policy Spec deny, Experimental facade).
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
  {
    schema: 'schemas/v2/error-contract-names.json',
    data: 'v2/error-contract-names.fixture.json',
  },
];

/** G5 / PT-ARCH-007 required contract semantic names. */
const REQUIRED_CONTRACT_NAMES = [
  'CapabilityUnavailable',
  'PolicyRejected',
  'ProtocolViolation',
  'ProviderFailure',
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
const identitySrcPath = join(ROOT, 'v2', 'provider-identity.fixture.json');
const identityDistPath = join(ROOT, 'dist', 'provider-identity.json');

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

  // PT-ARCH-005c: published identity pointer for package consumers.
  const identityPtr = index.identity;
  if (!identityPtr || typeof identityPtr !== 'object') {
    authorityFailed += 1;
    console.error('FAIL dist/index.json: missing identity pointer object');
  } else if (identityPtr.map !== 'provider-identity.json') {
    authorityFailed += 1;
    console.error(
      `FAIL dist/index.json identity.map: got ${JSON.stringify(identityPtr.map)}, expected "provider-identity.json"`,
    );
  }

  if (authorityFailed === 0) {
    console.log(
      'OK   dist/index.json authority + identity pointer (production_default=v1, latest=v2)',
    );
  }
  failed += authorityFailed;
}

// PT-ARCH-005c: dist identity map must match source fixture (third-party publish surface).
{
  let pubFailed = 0;
  if (!existsSync(identityDistPath)) {
    pubFailed += 1;
    console.error(
      'FAIL dist/provider-identity.json missing — run `npm run build` before validate:arch',
    );
  } else if (!existsSync(identitySrcPath)) {
    pubFailed += 1;
    console.error('FAIL v2/provider-identity.fixture.json missing');
  } else {
    const src = JSON.parse(readFileSync(identitySrcPath, 'utf8'));
    const dist = JSON.parse(readFileSync(identityDistPath, 'utf8'));
    if (JSON.stringify(src) !== JSON.stringify(dist)) {
      pubFailed += 1;
      console.error(
        'FAIL dist/provider-identity.json does not match v2/provider-identity.fixture.json',
      );
    } else {
      console.log('OK   dist/provider-identity.json matches fixture');
    }
  }
  failed += pubFailed;
}

for (const tree of PROVIDER_TREES) {
  failed += validateProviderRegistry(tree.name, tree.dir);
}

// PT-ARCH-005 / 005c / 005d: multi-family checks driven by published identity map.
{
  let identityFailed = 0;
  const map = JSON.parse(readFileSync(identitySrcPath, 'utf8'));
  const families = Array.isArray(map.families)
    ? map.families
    : map.canonical_id
      ? [{ canonical_id: map.canonical_id, aliases: map.aliases, trees: map.trees }]
      : [];

  if (families.length === 0) {
    identityFailed += 1;
    console.error('FAIL provider-identity map missing families[]');
  }

  const seenCanonical = new Set();
  const seenAlias = new Map(); // alias -> canonical

  for (const family of families) {
    const canonical = family && family.canonical_id;
    const aliases = Array.isArray(family && family.aliases) ? family.aliases : [];
    if (typeof canonical !== 'string' || aliases.length === 0) {
      identityFailed += 1;
      console.error(
        'FAIL provider-identity family missing canonical_id or aliases',
      );
      continue;
    }
    if (seenCanonical.has(canonical)) {
      identityFailed += 1;
      console.error(
        `FAIL provider-identity duplicate canonical_id ${JSON.stringify(canonical)}`,
      );
    }
    seenCanonical.add(canonical);

    for (const alias of aliases) {
      if (alias === canonical) {
        identityFailed += 1;
        console.error(
          `FAIL provider-identity alias ${JSON.stringify(alias)} equals canonical ${JSON.stringify(canonical)}`,
        );
      }
      if (seenAlias.has(alias)) {
        identityFailed += 1;
        console.error(
          `FAIL provider-identity alias ${JSON.stringify(alias)} claimed by both ${seenAlias.get(alias)} and ${canonical}`,
        );
      }
      seenAlias.set(alias, canonical);
    }

    const gatedTrees = family.trees
      ? Object.keys(family.trees).filter((t) => t === 'v2' || t === 'v2-alpha')
      : ['v2', 'v2-alpha'];

    for (const treeName of gatedTrees) {
      const primaryPath = join(ROOT, treeName, 'providers', `${canonical}.yaml`);
      for (const alias of aliases) {
        const aliasPath = join(ROOT, treeName, 'providers', `${alias}.yaml`);
        if (existsSync(aliasPath)) {
          identityFailed += 1;
          console.error(
            `FAIL ${treeName}/providers/${alias}.yaml must not exist (alias of ${canonical}; use aliases on primary)`,
          );
        }
      }
      if (!existsSync(primaryPath)) {
        identityFailed += 1;
        console.error(`FAIL ${treeName}/providers/${canonical}.yaml missing`);
        continue;
      }
      const doc = yaml.load(readFileSync(primaryPath, 'utf8'));
      if (!doc || doc.id !== canonical) {
        identityFailed += 1;
        console.error(
          `FAIL ${treeName}/providers/${canonical}.yaml id: got ${JSON.stringify(doc && doc.id)}, expected ${JSON.stringify(canonical)}`,
        );
      }
      const docAliases = Array.isArray(doc && doc.aliases) ? doc.aliases : [];
      for (const alias of aliases) {
        if (!docAliases.includes(alias)) {
          identityFailed += 1;
          console.error(
            `FAIL ${treeName}/providers/${canonical}.yaml aliases must include ${JSON.stringify(alias)} (from identity map)`,
          );
        }
      }
    }
  }

  if (identityFailed === 0) {
    const summary = families
      .map((f) => `${f.canonical_id}←[${(f.aliases || []).join(',')}]`)
      .join('; ');
    console.log(`OK   provider identity map applied: ${summary}`);
  }
  failed += identityFailed;
}

// ---------------------------------------------------------------------------
// PT-ARCH-007 (F9 / G5): error contract names ↔ E-code map
// ---------------------------------------------------------------------------
{
  let contractFailed = 0;
  const contractPath = join(ROOT, 'v2', 'error-contract-names.fixture.json');
  const errorCodesPath = join(ROOT, 'schemas', 'v2', 'error-codes.yaml');

  if (!existsSync(contractPath) || !existsSync(errorCodesPath)) {
    contractFailed += 1;
    console.error('FAIL PT-ARCH-007 error contract mapping files missing');
  } else {
    const contractDoc = JSON.parse(readFileSync(contractPath, 'utf8'));
    const errorDoc = yaml.load(readFileSync(errorCodesPath, 'utf8'));
    const knownCodes = new Set(Object.keys((errorDoc && errorDoc.error_codes) || {}));
    const names = Array.isArray(contractDoc.contract_names) ? contractDoc.contract_names : [];
    const seen = new Set();

    for (const required of REQUIRED_CONTRACT_NAMES) {
      if (!names.some((n) => n && n.name === required)) {
        contractFailed += 1;
        console.error(`FAIL error contract map missing required name ${JSON.stringify(required)}`);
      }
    }

    for (const entry of names) {
      const name = entry && entry.name;
      if (typeof name !== 'string') {
        contractFailed += 1;
        console.error('FAIL error contract entry missing name');
        continue;
      }
      if (seen.has(name)) {
        contractFailed += 1;
        console.error(`FAIL duplicate error contract name ${JSON.stringify(name)}`);
      }
      seen.add(name);

      const codes = Array.isArray(entry.maps_to_error_codes) ? entry.maps_to_error_codes : [];
      if (codes.length === 0) {
        contractFailed += 1;
        console.error(`FAIL ${name} maps_to_error_codes must be non-empty`);
      }
      for (const code of codes) {
        if (!knownCodes.has(code)) {
          contractFailed += 1;
          console.error(
            `FAIL ${name} maps to unknown E code ${JSON.stringify(code)} (not in error-codes.yaml)`,
          );
        }
      }
    }

    if (contractDoc.status !== 'normative') {
      contractFailed += 1;
      console.error(
        `FAIL error-contract-names status: got ${JSON.stringify(contractDoc.status)}, expected "normative"`,
      );
    }
  }

  if (contractFailed === 0) {
    console.log(
      `OK   error contract names (${REQUIRED_CONTRACT_NAMES.length} G5 names ↔ E codes)`,
    );
  }
  failed += contractFailed;
}

// ---------------------------------------------------------------------------
// PT-ARCH-008 (F11 pilot): vocabulary freeze + Policy deny + Experimental facade
// ---------------------------------------------------------------------------
{
  let archTestFailed = 0;
  const vocabSnapPath = join(ROOT, 'v2', 'architecture', 'capability-tag-freeze.snapshot.json');
  const facadeSnapPath = join(ROOT, 'v2', 'architecture', 'experimental-facade.snapshot.json');
  const tagFixturePath = join(ROOT, 'v2', 'capability-tag-mapping.fixture.json');

  // 1) Vocabulary freeze — CapabilityTag set must match snapshot.
  if (!existsSync(vocabSnapPath) || !existsSync(tagFixturePath)) {
    archTestFailed += 1;
    console.error('FAIL PT-ARCH-008 vocabulary freeze files missing');
  } else {
    const snap = JSON.parse(readFileSync(vocabSnapPath, 'utf8'));
    const fixture = JSON.parse(readFileSync(tagFixturePath, 'utf8'));
    const expected = Array.isArray(snap.capability_tags) ? [...snap.capability_tags].sort() : [];
    const actual = Array.isArray(fixture.mappings)
      ? fixture.mappings
          .map((m) => m && m.capability_tag)
          .filter((t) => typeof t === 'string')
          .sort()
      : [];
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      archTestFailed += 1;
      console.error(
        `FAIL CapabilityTag freeze drift: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    } else {
      console.log(`OK   CapabilityTag vocabulary freeze (${actual.length} tags)`);
    }
  }

  // 2) Policy Spec deny — public provider YAML must not grow host-policy keys.
  const POLICY_FORBIDDEN_TOP_LEVEL = new Set([
    'approval',
    'approvals',
    'allowlist',
    'tool_allowlist',
    'spend_cap',
    'spend_caps',
    'default_models',
    'eos_default',
    'capability_index',
    'candidate_rankings',
    'route_tag_inventory',
    'hiddenpath',
  ]);
  let policyFailed = 0;
  for (const tree of PROVIDER_TREES) {
    if (!existsSync(tree.dir)) continue;
    for (const name of readdirSync(tree.dir).sort()) {
      if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue;
      const filePath = join(tree.dir, name);
      let doc;
      try {
        doc = yaml.load(readFileSync(filePath, 'utf8'));
      } catch {
        continue;
      }
      if (!doc || typeof doc !== 'object') continue;
      for (const key of Object.keys(doc)) {
        if (POLICY_FORBIDDEN_TOP_LEVEL.has(key)) {
          policyFailed += 1;
          console.error(
            `FAIL ${tree.name}/providers/${name}: Policy Spec key ${JSON.stringify(key)} forbidden in public YAML (PT-ARCH-004 §4.2)`,
          );
        }
      }
    }
  }
  if (policyFailed === 0) {
    console.log('OK   public provider trees have no Policy Spec top-level keys');
  }
  archTestFailed += policyFailed;

  // 3) Experimental facade freeze — status + required keys.
  let facadeFailed = 0;
  if (!existsSync(facadeSnapPath)) {
    facadeFailed += 1;
    console.error('FAIL PT-ARCH-008 experimental-facade.snapshot.json missing');
  } else {
    const facadeSnap = JSON.parse(readFileSync(facadeSnapPath, 'utf8'));
    const fixtures = facadeSnap.fixtures && typeof facadeSnap.fixtures === 'object' ? facadeSnap.fixtures : {};
    for (const [rel, spec] of Object.entries(fixtures)) {
      const path = join(ROOT, rel);
      if (!existsSync(path)) {
        facadeFailed += 1;
        console.error(`FAIL Experimental facade fixture missing: ${rel}`);
        continue;
      }
      const doc = JSON.parse(readFileSync(path, 'utf8'));
      if (doc.status !== spec.required_status) {
        facadeFailed += 1;
        console.error(
          `FAIL ${rel} status: got ${JSON.stringify(doc.status)}, expected ${JSON.stringify(spec.required_status)}`,
        );
      }
      const requiredKeys = Array.isArray(spec.required_keys) ? spec.required_keys : [];
      for (const key of requiredKeys) {
        if (!(key in doc)) {
          facadeFailed += 1;
          console.error(`FAIL ${rel} missing required key ${JSON.stringify(key)}`);
        }
      }
    }
    if (facadeFailed === 0) {
      console.log('OK   Experimental facade freeze (Envelope + Tag mapping)');
    }
  }
  archTestFailed += facadeFailed;

  failed += archTestFailed;
}

process.exit(failed === 0 ? 0 : 1);
