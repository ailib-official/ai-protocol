# CI Validation Pipeline: Two Validation Methods Explained

This document explains the **two validation mechanisms** in the current `validate.yml`, their responsibilities, which ones can cause CI failures, and how they relate to each other.

> **Update (2026-01)**: CI now uses `npm ci` + `package-lock.json` for reproducible builds; `validate-configs.sh` has been removed; spec.yaml files now have dedicated schema validation; the build script automatically cleans the dist directory.

---

## 1. Overview of the Two Validation Methods

|  | **Method 1: npm / validate.js** | **Method 2: yamllint + Python JSON** |
|--|-------------------------------|------------------------------------|
| **CI Step** | Install dependencies and run canonical validator | Lint YAML syntax (yamllint) · Validate JSON schemas syntax |
| **Commands** | `npm ci` → `npm run validate` → `node scripts/validate.js` | `yamllint` for YAML; `python -c "import json; json.load(open(...))"` for schemas |
| **Causes Job Failure** | **Yes** (`process.exit(1)`) | yamllint: **No** (`continue-on-error: true`)<br>Python: **Yes** (`set -e`) |
| **Dependencies** | Node 18, npm, `package.json` + `package-lock.json` (ajv, ajv-formats, js-yaml) | Python 3.9, pip, yamllint |

---

## 2. Method 1: `npm run validate` (validate.js)

### 2.1 CI Behavior

- Step: After `Setup Node.js`, runs `npm ci` then `npm run validate`, which executes `node scripts/validate.js`.
- Uses `npm ci` instead of `npm install` to ensure dependency versions match `package-lock.json` exactly, improving reproducibility.
- If **any** validation fails, the script calls `process.exit(1)`, the step fails, **the entire validate job fails**, and subsequent steps (yamllint, Python) won't run.

### 2.2 What Gets Validated

| Target | Operation | Notes |
|--------|-----------|-------|
| **v1/providers/*.yaml** | Parse YAML → Validate `$schema` matches pattern → JSON Schema validation with `schemas/v1.json` | Missing fields, type errors, `format: "uri"` etc. checked by AJV+ajv-formats |
| **v1/models/*.yaml** | Same as above | Uses same v1 schema |
| **examples/*.yaml** | Same as above | Same |
| **v2-alpha/providers/*.yaml** | If present, validates with `schemas/v2/provider.json` | Includes `$schema` pattern check |
| **v1/spec.yaml, v2-alpha/spec.yaml** | Validates with `schemas/spec.json` | Ensures spec file structure integrity |
| **schemas themselves** | `loadSchema()`: `JSON.parse` + basic structure check | Covers v1.json, spec.json, v2/provider, endpoint, availability, capabilities, regions |

### 2.3 Technical Details

- **YAML**: Parsed with `js-yaml`. If a YAML file has syntax errors, parsing throws, gets caught, counted in `results.failed`, ultimately `exit(1)`.  
  → **Syntax correctness for all validated YAML files is covered by validate.js**.
- **JSON Schema**: AJV v8, draft 2020-12, with `ajv-formats` enabled (uri, email, uuid, etc.).  
  → Can detect invalid URIs for `official_url`, enum value errors, missing required fields, etc.
- **`$schema`**: Must exist and match the specified pattern (GitHub raw URL or relative path), otherwise fails immediately.

### 2.4 CI Impact

- **The only path that fails on "config/schema semantic errors"**:  
  Provider/model/example/spec YAML files that violate their schema, have invalid `$schema`, or schema files that aren't valid JSON or have incorrect structure will fail here.
- **Time cost**: `npm ci` takes most of the time (faster with cache); `validate.js` itself is quick.
- **lockfile requirement**: `npm ci` requires `package-lock.json` to exist and be consistent with `package.json`.

---

## 3. Method 2: yamllint + Python JSON Validation

### 3.1 CI Behavior

- Two independent steps:
  1. **Lint YAML syntax (yamllint)**  
     - Runs `yamllint` on `*.yaml` / `*.yml` files in `v1/providers`, `v1/models`, `examples`.  
     - `continue-on-error: true` → **Job won't fail regardless of yamllint errors**, only warnings in logs.
  2. **Validate JSON schemas syntax**  
     - Runs `python -c "import json; json.load(open('$schema'))"` on `schemas/*.json`, `schemas/v2/*.json`.  
     - Uses `set -e` → **If any schema isn't valid JSON, this step fails, Job fails**.

### 3.2 What yamllint Does

- Checks YAML **format and style**: indentation, trailing spaces, duplicate keys, document format, etc.  
- Does **not** do JSON Schema validation, does **not** understand `$schema` or business fields.  
- Relationship with validate.js:  
  - validate.js's `js-yaml` already ensures that parseable YAML has no **syntax** problems.  
  - yamllint adds a **style/readability** check, but does **not affect** CI pass/fail (due to `continue-on-error`).

### 3.3 What Python `json.load` Does

- Only does **JSON syntax** validation: whether `json.load` can parse it.  
- Does **not** do JSON Schema semantics, `$ref` resolution, format validation, etc.  
- Relationship with validate.js:  
  - validate.js's `loadSchema()` already does `JSON.parse` and basic structure check on `schemas/v1.json`, `schemas/v2/*.json`, etc.  
  - Therefore, this Python step **overlaps** with validate.js on "whether schema is valid JSON"; running both is a redundant safeguard with minimal cost.

### 3.4 CI Impact

| Step | Causes Job Failure | Notes |
|------|-------------------|-------|
| Lint YAML (yamllint) | **No** | Log only; catches style issues early, doesn't block merges. |
| Validate JSON schemas (Python) | **Yes** | If any `schemas/*.json` or `schemas/v2/*.json` isn't valid JSON, Job fails. |

- Only **Python's JSON syntax check** directly determines Job red/green; yamllint only affects log content.
- If validate.js fails first, these two steps won't run; if validate.js passes:  
  - yamllint runs and produces warnings only;  
  - Python runs, and any invalid JSON schema will still fail the Job.

---

## 4. Overlap and Division of Labor

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    validate.js                           │
                    │  · YAML parsing (js-yaml) → syntax errors cause failure  │
                    │  · $schema presence and format check                     │
                    │  · JSON Schema validation for schemas/v1.json, v2/*.json │
                    │  · schemas themselves: JSON.parse + basic structure      │
                    └─────────────────────────────────────────────────────────┘
                                               │
                    Failure → Job fails, subsequent steps don't run
                    Success ↓
    ┌──────────────────────────────────────────────────────────────────────────┐
    │  yamllint (continue-on-error)  │  Python json.load (set -e)              │
    │  · YAML style/format           │  · JSON syntax for schemas              │
    │  · Doesn't cause Job failure   │  · Failure → Job fails                  │
    └──────────────────────────────────────────────────────────────────────────┘
```

- **YAML syntax**: Covered by validate.js's `js-yaml`; yamllint is a **style-level supplement** and doesn't participate in pass/fail.
- **YAML JSON Schema semantics**: **Only** validate.js does this; neither yamllint nor Python do.
- **"Is schemas/*.json valid JSON"**: Both validate.js's `loadSchema` and Python's `json.load` do this; Python serves as a secondary confirmation outside the Node validation.

---

## 5. Overall CI Impact Summary

| Dimension | Method 1 (validate.js) | Method 2 (yamllint + Python) |
|-----------|------------------------|------------------------------|
| **Can cause Job failure** | Yes; the **primary source** of config/schema issues | yamllint: No; Python: Yes (schema JSON syntax only) |
| **Execution order** | Runs first; failure stops subsequent steps | Runs after; depends on Method 1 passing |
| **Role in "Does config conform to AI-Protocol spec"** | Core: $schema, fields, types, format, enums, etc. | None; only YAML style and schema JSON syntax |
| **Dependencies & time** | Node + `npm ci` (with cache), main time cost | Python + yamllint; quick |
| **Relationship with package-lock.json** | Required; `npm ci` needs it for version consistency | Not related |

Conclusion:

- **CI pass/fail is primarily determined by validate.js**:  
  - Provider/model/example/spec YAML files that don't conform to schema in format or semantics, or have invalid `$schema`, will fail here.  
- **yamllint**: Doesn't change pass/fail, only provides additional YAML style reports.  
- **Python schema JSON check**: Given that validate.js already does `JSON.parse` on schemas, this is **redundant protection**; if validate.js's `--schemas` stably covers all `schemas/*.json` and `schemas/v2/*.json`, the Python step could theoretically be removed to simplify the pipeline, but keeping it adds another layer of safety at minimal cost.

---

## 6. Build Mechanism

### 6.1 Build Script (`scripts/build.js`)

The build script converts YAML source files to JSON format and outputs to the `dist/` directory.

**Key Features**:

- **dist directory cleaning**: Automatically cleans `dist/` before each build to prevent stale files
- **Recursive processing**: Processes all YAML files in `v1/` and `v2-alpha/` directories
- **Index generation**: Automatically generates `dist/index.json` with version information

### 6.2 CI Build

```yaml
- name: Build JSON artifacts
  run: npm run build
```

Build runs after validation passes, and the generated `dist/` directory is uploaded as an artifact.

---

## 7. Optional CI Adjustments

1. **If you think Python's schema JSON check completely overlaps with validate.js**:  
   - Remove the "Validate JSON schemas syntax" step, rely only on validate.js's `loadSchema`;  
   - Benefit: One less step, more centralized logic; Cost: One less implementation-independent check using only Python stdlib.

2. **If you want yamllint to also cause CI failure**:  
   - Remove `continue-on-error: true`, and configure `.yamllint` to tighten or relax rules as needed;  
   - Note: If yamllint rules are too strict, they may error on currently valid YAML, requiring adjustment.

---

## Report Archival Policy

Governance gate reports (`reports/` directory) are **generated artifacts**, not source-controlled content.

- `reports/compliance-gates/`, `reports/drift/`, `reports/fullchain-gates/`, `reports/manifest-gates/`, `reports/release-gates/`, `reports/rollback-rehearsals/`, `reports/report-evidence-gates/` are all gitignored.
- **CI archival**: Governance workflows archive report JSON files as GitHub Actions artifacts with configurable retention (default: 90 days).
- **Local use**: Developers may generate reports locally for debugging; these stay local and are never committed.
- **Audit trail**: For release gate evidence, the CI workflow uploads artifacts linked to the specific run. Reference the workflow run URL in release notes or task closure records.
