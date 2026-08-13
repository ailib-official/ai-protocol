#!/usr/bin/env node
/**
 * PT-ARCH-001…005(+b/d) + PT-ARCH-007/008/010/011 — validate Architecture fixtures,
 * dist authority, provider-identity registry gates, F9 error contract names,
 * F11 pilot assertions (vocabulary freeze, Policy Spec deny, Experimental facade),
 * F12 Pack/ProviderContract boundary resolve gates,
 * F8 Capability Catalog skeleton coverage,
 * and PT-ME-004 ME-001 baseline (ai_provider metadata.models non-empty; omit≠false).
 *
 * Run after `npm run build` so dist/index.json exists (CI order: build then validate:arch).
 *
 * Identity model (no dual wire keys): primary `id` + optional `aliases[]`.
 * Registry gates forbid silent dual-identity without an alias map.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
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
  {
    schema: 'schemas/v2/capability-catalog.json',
    data: 'v2/capability-catalog.fixture.json',
  },
  {
    schema: 'schemas/v2/metadata-model-entry.json',
    data: 'v2/metadata-model-entry.fixture.json',
  },
  {
    schema: 'schemas/v2/metadata-model-entry.json',
    data: 'v2/metadata-model-entry-omit.fixture.json',
  },
  {
    schema: 'schemas/v2/metadata-model-entry.json',
    data: 'v2/metadata-model-entry-generative.fixture.json',
  },
  {
    schema: 'schemas/v2/generative-endpoint-entry.json',
    data: 'v2/generative-endpoint-entry.fixture.json',
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

const compiledBySchema = new Map();
for (const f of fixtures) {
  let validate = compiledBySchema.get(f.schema);
  if (!validate) {
    const schema = JSON.parse(readFileSync(join(ROOT, f.schema), 'utf8'));
    // Avoid needing remote meta-schema fetch in offline CI.
    delete schema.$schema;
    validate = ajv.compile(schema);
    compiledBySchema.set(f.schema, validate);
  }
  const data = JSON.parse(readFileSync(join(ROOT, f.data), 'utf8'));
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

  // 4) F12 — Pack / ProviderContract provider ids must resolve via registry + identity.
  function collectResolvableProviderIds() {
    const ids = new Set();
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
        if (!doc || typeof doc !== 'object' || typeof doc.id !== 'string') continue;
        ids.add(doc.id);
        if (Array.isArray(doc.aliases)) {
          for (const a of doc.aliases) {
            if (typeof a === 'string' && a) ids.add(a);
          }
        }
      }
    }
    if (existsSync(identityDistPath)) {
      try {
        const map = JSON.parse(readFileSync(identityDistPath, 'utf8'));
        const families = Array.isArray(map.families) ? map.families : [];
        for (const family of families) {
          if (family && typeof family.canonical_id === 'string') {
            ids.add(family.canonical_id);
          }
          if (family && Array.isArray(family.aliases)) {
            for (const a of family.aliases) {
              if (typeof a === 'string' && a) ids.add(a);
            }
          }
        }
      } catch {
        // identity gates above already report parse/missing issues
      }
    }
    return ids;
  }

  const resolvableIds = collectResolvableProviderIds();
  let boundaryFailed = 0;

  const contractDir = join(ROOT, 'v2', 'contracts');
  if (existsSync(contractDir)) {
    for (const name of readdirSync(contractDir).sort()) {
      if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue;
      const filePath = join(contractDir, name);
      let doc;
      try {
        doc = yaml.load(readFileSync(filePath, 'utf8'));
      } catch (e) {
        boundaryFailed += 1;
        console.error(`FAIL v2/contracts/${name}: YAML parse error: ${e.message}`);
        continue;
      }
      const pid = doc && doc.provider_id;
      if (typeof pid !== 'string' || !pid) {
        boundaryFailed += 1;
        console.error(`FAIL v2/contracts/${name}: missing provider_id`);
        continue;
      }
      if (!resolvableIds.has(pid)) {
        boundaryFailed += 1;
        console.error(
          `FAIL v2/contracts/${name}: provider_id ${JSON.stringify(pid)} does not resolve to a public provider id/alias (F12)`,
        );
      }
    }
  }

  const packDir = join(ROOT, 'v2', 'packs');
  const packFiles = [];
  if (existsSync(packDir)) {
    const walk = (currentDir) => {
      for (const name of readdirSync(currentDir).sort()) {
        const full = join(currentDir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
        } else if (name.endsWith('.json')) {
          packFiles.push(full);
        }
      }
    };
    walk(packDir);
  }
  for (const filePath of packFiles) {
    const rel = filePath.replace(`${ROOT}/`, '');
    let doc;
    try {
      doc = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (e) {
      boundaryFailed += 1;
      console.error(`FAIL ${rel}: JSON parse error: ${e.message}`);
      continue;
    }
    const routes = Array.isArray(doc.provider_routes) ? doc.provider_routes : [];
    for (let i = 0; i < routes.length; i += 1) {
      const provider = routes[i] && routes[i].provider;
      if (typeof provider !== 'string' || !provider) {
        boundaryFailed += 1;
        console.error(`FAIL ${rel}: provider_routes[${i}].provider missing`);
        continue;
      }
      if (!resolvableIds.has(provider)) {
        boundaryFailed += 1;
        console.error(
          `FAIL ${rel}: provider ${JSON.stringify(provider)} does not resolve to a public provider id/alias (F12)`,
        );
      }
    }
  }

  const boundariesDoc = join(ROOT, 'docs', 'PACK_CONTRACT_BOUNDARIES.md');
  if (!existsSync(boundariesDoc)) {
    boundaryFailed += 1;
    console.error('FAIL docs/PACK_CONTRACT_BOUNDARIES.md missing (PT-ARCH-010 / F12)');
  }

  if (boundaryFailed === 0) {
    console.log(
      'OK   Pack/ProviderContract boundaries (contracts + packs resolve; Normative doc present)',
    );
  }
  archTestFailed += boundaryFailed;

  // 5) F8 — Capability Catalog skeleton covers wire ProviderCapability enum exactly.
  let catalogFailed = 0;
  const catalogDocPath = join(ROOT, 'docs', 'CAPABILITY_CATALOG.md');
  if (!existsSync(catalogDocPath)) {
    catalogFailed += 1;
    console.error('FAIL docs/CAPABILITY_CATALOG.md missing (PT-ARCH-011 / F8)');
  }
  const capsSchemaPath = join(ROOT, 'schemas', 'v2', 'capabilities.json');
  const catalogFixturePath = join(ROOT, 'v2', 'capability-catalog.fixture.json');
  if (!existsSync(capsSchemaPath) || !existsSync(catalogFixturePath)) {
    catalogFailed += 1;
    console.error('FAIL F8 catalog coverage: missing capabilities.json or capability-catalog.fixture.json');
  } else {
    const capsSchema = JSON.parse(readFileSync(capsSchemaPath, 'utf8'));
    const expected = new Set(
      (((capsSchema.$defs || {}).capability_name || {}).enum) || [],
    );
    const catalog = JSON.parse(readFileSync(catalogFixturePath, 'utf8'));
    if (catalog.status !== 'normative_skeleton' && catalog.status !== 'normative') {
      catalogFailed += 1;
      console.error(
        `FAIL capability-catalog status: got ${JSON.stringify(catalog.status)}, expected normative_skeleton|normative`,
      );
    }
    const ids = [];
    const seen = new Set();
    for (const entry of Array.isArray(catalog.entries) ? catalog.entries : []) {
      if (!entry || typeof entry.id !== 'string') {
        catalogFailed += 1;
        console.error('FAIL capability-catalog entry missing id');
        continue;
      }
      if (entry.kind !== 'provider_capability') {
        catalogFailed += 1;
        console.error(
          `FAIL capability-catalog entry ${JSON.stringify(entry.id)}: skeleton allows kind provider_capability only`,
        );
      }
      if (seen.has(entry.id)) {
        catalogFailed += 1;
        console.error(`FAIL capability-catalog duplicate id ${JSON.stringify(entry.id)}`);
      }
      seen.add(entry.id);
      ids.push(entry.id);
      if (!expected.has(entry.id)) {
        catalogFailed += 1;
        console.error(
          `FAIL capability-catalog id ${JSON.stringify(entry.id)} not in capabilities.json capability_name enum`,
        );
      }
      for (const field of ['schema_ref', 'version', 'compatibility', 'metadata', 'provider_mapping']) {
        if (!(field in entry)) {
          catalogFailed += 1;
          console.error(`FAIL capability-catalog ${entry.id}: missing C2 field ${field}`);
        }
      }
    }
    for (const need of expected) {
      if (!seen.has(need)) {
        catalogFailed += 1;
        console.error(
          `FAIL capability-catalog missing ProviderCapability ${JSON.stringify(need)} (F8 coverage)`,
        );
      }
    }
    if (catalogFailed === 0) {
      console.log(
        `OK   Capability Catalog skeleton (${ids.length} provider_capability entries ↔ wire enum)`,
      );
    }
  }
  archTestFailed += catalogFailed;

  // 6) MULTI-ALIAS-XLANG-001 — golden alias→canonical vectors match identity map.
  let goldenFailed = 0;
  const goldenPath = join(ROOT, 'v2', 'alias-resolve.golden.json');
  const identityFixturePath = join(ROOT, 'v2', 'provider-identity.fixture.json');
  if (!existsSync(goldenPath)) {
    goldenFailed += 1;
    console.error('FAIL v2/alias-resolve.golden.json missing (MULTI-ALIAS-XLANG-001)');
  } else if (!existsSync(identityFixturePath)) {
    goldenFailed += 1;
    console.error('FAIL v2/provider-identity.fixture.json missing (needed for golden check)');
  } else {
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
    const identity = JSON.parse(readFileSync(identityFixturePath, 'utf8'));
    if (golden.status !== 'experimental') {
      goldenFailed += 1;
      console.error(
        `FAIL alias-resolve.golden status: got ${JSON.stringify(golden.status)}, expected experimental`,
      );
    }
    const norm = golden.normalization || {};
    if (norm.case !== 'exact' || norm.hyphen_underscore !== 'none') {
      goldenFailed += 1;
      console.error(
        'FAIL alias-resolve.golden normalization must be case=exact, hyphen_underscore=none (P0)',
      );
    }

    function resolveFromMap(map, key) {
      const families = Array.isArray(map.families) ? map.families : [];
      for (const family of families) {
        if (!family || typeof family.canonical_id !== 'string') continue;
        if (key === family.canonical_id) return family.canonical_id;
        const aliases = Array.isArray(family.aliases) ? family.aliases : [];
        if (aliases.includes(key)) return family.canonical_id;
      }
      return null;
    }

    const vectors = Array.isArray(golden.vectors) ? golden.vectors : [];
    if (vectors.length === 0) {
      goldenFailed += 1;
      console.error('FAIL alias-resolve.golden vectors must be non-empty');
    }
    for (const v of vectors) {
      if (!v || typeof v.input !== 'string') {
        goldenFailed += 1;
        console.error('FAIL alias-resolve.golden vector missing input string');
        continue;
      }
      const expected =
        v.canonical === null || v.canonical === undefined ? null : String(v.canonical);
      const got = resolveFromMap(identity, v.input);
      if (got !== expected) {
        goldenFailed += 1;
        console.error(
          `FAIL golden ${JSON.stringify(v.input)}: map→${JSON.stringify(got)} golden→${JSON.stringify(expected)}`,
        );
      }
    }
    if (goldenFailed === 0) {
      console.log(`OK   alias-resolve golden (${vectors.length} vectors ↔ provider-identity map)`);
    }
  }
  archTestFailed += goldenFailed;

  // 7) PT-ME-004 — ME-001 baseline: every v2 ai_provider has non-empty metadata.models;
  //    omit model_capabilities is allowed (unknown); do NOT require ads ≡ model union.
  let meFailed = 0;
  const v2ProvDir = join(ROOT, 'v2', 'providers');
  if (!existsSync(v2ProvDir)) {
    meFailed += 1;
    console.error('FAIL PT-ME-004: v2/providers missing');
  } else {
    const files = readdirSync(v2ProvDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    let aiProviderCount = 0;
    for (const name of files) {
      const filePath = join(v2ProvDir, name);
      let doc;
      try {
        doc = yaml.load(readFileSync(filePath, 'utf8'));
      } catch (e) {
        meFailed += 1;
        console.error(`FAIL PT-ME-004 load ${name}: ${e.message}`);
        continue;
      }
      if (!doc || doc.category !== 'ai_provider') continue;
      aiProviderCount += 1;
      const models = doc.metadata && doc.metadata.models ? doc.metadata.models : null;
      const keys = models && typeof models === 'object' ? Object.keys(models) : [];
      if (keys.length === 0) {
        meFailed += 1;
        console.error(
          `FAIL PT-ME-004 ${name}: ai_provider MUST have non-empty metadata.models (ME-001 baseline)`,
        );
        continue;
      }
      for (const mid of keys) {
        const entry = models[mid];
        if (!entry || typeof entry !== 'object') {
          meFailed += 1;
          console.error(`FAIL PT-ME-004 ${name}: model "${mid}" entry invalid`);
          continue;
        }
        // Explicit anti-pattern: do not encode "unknown" by forcing false on all flags.
        // We only assert presence of models; omitted model_capabilities is OK (omit fixture).
        if (entry.model_capabilities === null) {
          meFailed += 1;
          console.error(
            `FAIL PT-ME-004 ${name}/${mid}: model_capabilities must be object or omitted (not null)`,
          );
        }
      }
    }
    if (aiProviderCount === 0) {
      meFailed += 1;
      console.error('FAIL PT-ME-004: no category=ai_provider manifests in v2/providers');
    }
    if (meFailed === 0) {
      console.log(
        `OK   ME-001 baseline (${aiProviderCount} ai_provider non-empty metadata.models; ads≠SoT; omit≠false)`,
      );
    }
  }
  archTestFailed += meFailed;

  failed += archTestFailed;
}

process.exit(failed === 0 ? 0 : 1);
