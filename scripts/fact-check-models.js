#!/usr/bin/env node

/**
 * Optional runtime fact-check for ai-protocol model registry.
 *
 * The registry is sustainable without API keys: primary verification is via
 * public API reference / documentation (verification.source = doc URL). This
 * script is an optional tool for contributors who have API keys and want to
 * verify entries against providers’ list_models (or equivalent) at runtime.
 *
 * What it does:
 * - Loads v1 provider configs and model registry
 * - For providers with services.list_models, calls the upstream list endpoint
 * - Compares registry model_ids to upstream; reports missing / errors
 *
 * Philosophy:
 * - No mandatory API keys; missing key → provider skipped (not failed) unless --require-keys.
 * - Use --strict to fail on missing models or fetch errors.
 *
 * Node: >= 18 (uses global fetch)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import yaml from 'js-yaml';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const ROOT_DIR = resolve(process.cwd());

function parseArgs(argv) {
  const out = {
    providers: null,        // Set<string> or null (all)
    requireKeys: false,
    strict: false,
    timeoutMs: 15000,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--providers') {
      const v = argv[++i] || '';
      out.providers = new Set(v.split(',').map(s => s.trim()).filter(Boolean));
    } else if (a === '--require-keys') {
      out.requireKeys = true;
    } else if (a === '--strict') {
      out.strict = true;
    } else if (a === '--verbose') {
      out.verbose = true;
    } else if (a === '--timeout-ms') {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) throw new Error('Invalid --timeout-ms');
      out.timeoutMs = v;
    }
  }
  return out;
}

function setupProxyFromEnv({ verbose }) {
  // Node fetch (undici) does not automatically respect system proxy settings.
  // We support common envs used in this repo ecosystem.
  const proxy =
    process.env.AI_PROXY_URL ||
    process.env.PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY;

  if (!proxy) return;

  try {
    setGlobalDispatcher(new ProxyAgent(proxy));
    if (verbose) console.log(`[fact-check] proxy enabled via ${proxy}`);
  } catch (e) {
    if (verbose) console.warn(`[fact-check] proxy setup failed: ${e?.message || String(e)}`);
  }
}

function loadYamlFile(filePath) {
  const content = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  return yaml.load(content, { schema: yaml.DEFAULT_SAFE_SCHEMA, json: true });
}

function listYamlFiles(dir) {
  return readdirSync(dir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map(f => join(dir, f));
}

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function joinUrl(base, path) {
  const b = normalizeBaseUrl(base);
  if (!path) return b;
  return path.startsWith('/') ? `${b}${path}` : `${b}/${path}`;
}

function redactUrl(raw) {
  try {
    const u = new URL(raw);
    // Redact common secret query params (Gemini uses `key`)
    for (const k of ['key', 'api_key', 'apikey', 'token', 'access_token']) {
      if (u.searchParams.has(k)) u.searchParams.set(k, '***');
    }
    return u.toString();
  } catch {
    return raw;
  }
}

function withTimeout(signal, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error('timeout')), timeoutMs);
  const onAbort = () => ac.abort(signal.reason || new Error('aborted'));
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  return {
    signal: ac.signal,
    dispose: () => {
      clearTimeout(t);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithRetries(url, { method, headers, timeoutMs, retries, verbose, providerId }) {
  // Retry on:
  // - transient network errors (fetch throws)
  // - 429 / 5xx (provider overload / transient)
  //
  // NOTE: This is for validation stability; it is not a general client retry policy.
  let attempt = 0;
  let lastErr = null;

  while (attempt <= retries) {
    const timeout = withTimeout(null, timeoutMs);
    try {
      const resp = await fetch(url, { method, headers, signal: timeout.signal });
      const text = await resp.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }

      if (!resp.ok) {
        const retryable = resp.status === 429 || (resp.status >= 500 && resp.status <= 599);
        if (retryable && attempt < retries) {
          const wait = 400 * Math.pow(2, attempt);
          if (verbose) console.warn(`[fact-check] provider=${providerId} HTTP ${resp.status} retry in ${wait}ms`);
          await sleep(wait);
          attempt++;
          continue;
        }
        return { ok: false, status: resp.status, text, json };
      }

      return { ok: true, status: resp.status, text, json };
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        const wait = 400 * Math.pow(2, attempt);
        if (verbose) console.warn(`[fact-check] provider=${providerId} fetch failed retry in ${wait}ms: ${e?.message || String(e)}`);
        await sleep(wait);
        attempt++;
        continue;
      }
      return { ok: false, status: 0, text: '', json: null, error: e };
    } finally {
      timeout.dispose();
    }
  }

  return { ok: false, status: 0, text: '', json: null, error: lastErr };
}

function extractProviderModelIds(providerId, providerCfg, json) {
  // Gemini is special: list_models response returns { models: [ { name: "models/<id>", ... } ] }
  if (providerId === 'gemini') {
    const arr = json?.models;
    if (!Array.isArray(arr)) return [];
    return arr
      .map(m => m?.name)
      .filter(s => typeof s === 'string')
      .map(s => s.startsWith('models/') ? s.slice('models/'.length) : s)
      .filter(Boolean);
  }

  const binding = providerCfg?.services?.list_models?.response_binding;
  const data = binding ? json?.[binding] : json;
  if (Array.isArray(data)) {
    // OpenAI-style: each item has { id: "..." }
    const ids = data.map(x => x?.id).filter(s => typeof s === 'string' && s.length > 0);
    if (ids.length > 0) return ids;

    // Fallback: array of strings
    return data.filter(s => typeof s === 'string' && s.length > 0);
  }

  // Fallback heuristics: some providers might return { data: { ... } } etc
  if (data && typeof data === 'object') {
    const maybe = data.models || data.data || data.items;
    if (Array.isArray(maybe)) {
      const ids = maybe.map(x => x?.id).filter(s => typeof s === 'string' && s.length > 0);
      if (ids.length > 0) return ids;
    }
  }

  return [];
}

function buildAuth(providerCfg) {
  const auth = providerCfg?.auth;
  if (!auth) return { kind: 'none' };

  const tokenEnv = auth.token_env;
  const token = tokenEnv ? process.env[tokenEnv] : undefined;

  if (auth.type === 'bearer') {
    if (!token) return { kind: 'missing', tokenEnv };
    return { kind: 'header', headers: { Authorization: `Bearer ${token}` } };
  }

  if (auth.type === 'query_param') {
    // e.g. Gemini: param_name=key
    const name = auth.param_name || 'key';
    if (!token) return { kind: 'missing', tokenEnv };
    return { kind: 'query', name, value: token };
  }

  // Unknown auth types are treated as non-checkable unless key is present and user extends this.
  if (!token) return { kind: 'missing', tokenEnv };
  return { kind: 'unknown', tokenEnv };
}

function splitRegistryModelsByProvider(modelEntries) {
  const m = new Map();
  for (const e of modelEntries) {
    if (!m.has(e.provider)) m.set(e.provider, []);
    m.get(e.provider).push(e);
  }
  return m;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  setupProxyFromEnv({ verbose: args.verbose });

  const providersDir = join(ROOT_DIR, 'v1', 'providers');
  const modelsDir = join(ROOT_DIR, 'v1', 'models');

  const providerFiles = listYamlFiles(providersDir);
  const modelFiles = listYamlFiles(modelsDir);

  const providers = new Map(); // id -> cfg
  for (const p of providerFiles) {
    const doc = loadYamlFile(p);
    if (doc?.id) providers.set(doc.id, doc);
  }

  const modelEntries = []; // { provider, model_id, key, file, status }
  for (const f of modelFiles) {
    const doc = loadYamlFile(f);
    const models = doc?.models || {};
    for (const [key, val] of Object.entries(models)) {
      if (!val?.provider || !val?.model_id) continue;
      modelEntries.push({
        provider: val.provider,
        model_id: String(val.model_id),
        key,
        file: f,
        status: val.status ? String(val.status) : 'active',
      });
    }
  }

  const byProvider = splitRegistryModelsByProvider(modelEntries);

  const summary = {
    checkedProviders: 0,
    skippedProviders: 0,
    okModels: 0,
    missingModels: 0,
    errors: 0,
    skippedModels: 0,
  };

  const failures = [];

  for (const [providerId, models] of Array.from(byProvider.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (args.providers && !args.providers.has(providerId)) continue;

    const cfg = providers.get(providerId);
    if (!cfg) {
      summary.skippedProviders++;
      summary.skippedModels += models.length;
      continue;
    }

    const listModels = cfg?.services?.list_models;
    if (!listModels?.path || !cfg?.endpoint?.base_url) {
      summary.skippedProviders++;
      summary.skippedModels += models.length;
      continue;
    }

    const auth = buildAuth(cfg);
    if (auth.kind === 'missing') {
      if (args.requireKeys) {
        summary.errors++;
        failures.push({
          provider: providerId,
          error: `Missing API key env var ${auth.tokenEnv} for provider ${providerId}`,
        });
      } else {
        summary.skippedProviders++;
        summary.skippedModels += models.length;
      }
      continue;
    }

    if (auth.kind === 'unknown') {
      // We have a token but don't know how to apply it; treat as skipped for now.
      summary.skippedProviders++;
      summary.skippedModels += models.length;
      continue;
    }

    // Build URL
    let url = joinUrl(cfg.endpoint.base_url, listModels.path);
    if (auth.kind === 'query') {
      const u = new URL(url);
      u.searchParams.set(auth.name, auth.value);
      url = u.toString();
    }

    const headers = {
      'Accept': 'application/json',
      ...(auth.kind === 'header' ? auth.headers : {}),
    };

    if (args.verbose) console.log(`[fact-check] provider=${providerId} url=${redactUrl(url)}`);

    try {
      const res = await fetchJsonWithRetries(url, {
        method: 'GET',
        headers,
        timeoutMs: args.timeoutMs,
        retries: 2,
        verbose: args.verbose,
        providerId,
      });

      if (!res.ok) {
        summary.errors++;
        failures.push({
          provider: providerId,
          error: res.status ? `HTTP ${res.status} from list_models` : `Fetch failed: ${res.error?.message || 'fetch failed'}`,
          body: res.text?.slice(0, 600) || '',
        });
        continue;
      }

      const upstreamIds = new Set(extractProviderModelIds(providerId, cfg, res.json));
      summary.checkedProviders++;

      for (const m of models) {
        // Registry may keep historical entries. Only active models are required to exist upstream.
        if (m.status && m.status !== 'active') {
          summary.skippedModels++;
          continue;
        }
        if (upstreamIds.has(m.model_id)) {
          summary.okModels++;
        } else {
          summary.missingModels++;
          failures.push({
            provider: providerId,
            model_id: m.model_id,
            registry_key: m.key,
            file: m.file,
            error: 'model_id not found in upstream /models list',
          });
        }
      }
    } catch (e) {
      summary.errors++;
      failures.push({
        provider: providerId,
        error: `Fetch failed: ${e?.message || String(e)}`,
      });
    }
  }

  // Print results
  console.log('\n[ai-protocol fact-check] summary');
  console.log(JSON.stringify(summary, null, 2));

  if (failures.length) {
    console.log('\n[ai-protocol fact-check] issues');
    for (const f of failures) {
      console.log(JSON.stringify(f));
    }
  }

  const shouldFail = args.strict && (summary.missingModels > 0 || summary.errors > 0);
  process.exit(shouldFail ? 1 : 0);
}

main().catch((e) => {
  console.error('[fact-check] fatal:', e);
  process.exit(1);
});

