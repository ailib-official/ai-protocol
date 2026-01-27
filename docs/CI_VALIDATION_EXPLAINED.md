# CI 中两种验证方式对流水线的影响

本文说明当前 `validate.yml` 里**两套验证机制**各自做什么、谁会令 CI 失败，以及它们之间的关系。

> **更新说明 (2026-01)**: CI 已改用 `npm ci` + `package-lock.json` 以提高可复现性；`validate-configs.sh` 已删除；新增 `spec.yaml` 专用 schema 验证；构建脚本会自动清理 dist 目录。

---

## 一、当前 CI 中的两种验证方式概览

|  | **方式一：npm / validate.js** | **方式二：yamllint + Python JSON** |
|--|-------------------------------|------------------------------------|
| **对应步骤** | Install dependencies and run canonical validator | Lint YAML syntax (yamllint) · Validate JSON schemas syntax |
| **触发命令** | `npm ci` → `npm run validate` → `node scripts/validate.js` | `yamllint` 对 YAML；`python -c "import json; json.load(open(...))"` 对 schema |
| **失败时是否导致 Job 失败** | **是**（`process.exit(1)`） | yamllint：**否**（`continue-on-error: true`）<br>Python：**是**（`set -e`） |
| **依赖** | Node 18、npm、`package.json` + `package-lock.json`（ajv, ajv-formats, js-yaml） | Python 3.9、pip、yamllint |

---

## 二、方式一：`npm run validate`（validate.js）

### 2.1 在 CI 中的表现

- 步骤：`Setup Node.js` 之后，执行  
  `npm ci` 再 `npm run validate`，即运行 `node scripts/validate.js`。
- 使用 `npm ci` 而非 `npm install`，确保依赖版本与 `package-lock.json` 完全一致，提高可复现性。
- 若**任意一项**校验不通过，脚本 `process.exit(1)`，该 step 失败，**整个 validate job 失败**，后续 step（yamllint、Python）不会跑。

### 2.2 实际校验内容

| 对象 | 操作 | 说明 |
|------|------|------|
| **v1/providers/*.yaml** | 读入 YAML → 校验 `$schema` 符合约定 → 用 `schemas/v1.json` 做 JSON Schema 校验 | 缺字段、类型错误、`format: "uri"` 等均由 AJV+ajv-formats 检查 |
| **v1/models/*.yaml** | 同上 | 与 v1 使用同一 schema |
| **examples/*.yaml** | 同上 | 同上 |
| **v2-alpha/providers/*.yaml** | 若存在，用 `schemas/v2/provider.json` 校验 | 含 `$schema` 模式检查 |
| **v1/spec.yaml, v2-alpha/spec.yaml** | 用 `schemas/spec.json` 校验 | 验证规范文件结构完整性 |
| **schemas 自身** | `loadSchema()`：`JSON.parse` + 基本结构检查 | 覆盖 v1.json、spec.json、v2/provider、endpoint、availability、capabilities、regions |

### 2.3 技术细节

- **YAML**：用 `js-yaml` 解析。若某 YAML 语法错误，解析抛错，被 catch 后计入 `results.failed`，最终 `exit(1)`。  
  → 对**所有被校验的 YAML**，**语法正确性已在 validate.js 中覆盖**。
- **JSON Schema**：AJV v8，draft 2020-12，并启用 `ajv-formats`（uri、email、uuid 等）。  
  → 能发现 `official_url` 非合法 URI、枚举值错误、必填缺失等。
- **`$schema`**：必须存在且匹配指定模式（如 GitHub raw 或相对路径），否则直接判失败。

### 2.4 对 CI 的影响

- **唯一会因「配置 / schema 语义错误」而 fail 的主通路**：  
  provider/model/example/spec 的 YAML 违背对应 schema、`$schema` 非法、或 schema 文件本身不是合法 JSON/结构不对，都会在这里失败。
- **耗时应答**：`npm ci` 占大部分时间（使用缓存后会加速）；`validate.js` 本身较快。
- **lockfile 要求**：使用 `npm ci` 要求 `package-lock.json` 存在且与 `package.json` 一致。

---

## 三、方式二：yamllint + Python 校验 JSON 语法

### 3.1 在 CI 中的表现

- 两个独立 step：
  1. **Lint YAML syntax (yamllint)**  
     - 对 `v1/providers`、`v1/models`、`examples` 下的 `*.yaml` / `*.yml` 跑 `yamllint`。  
     - `continue-on-error: true` → **无论 yamllint 是否报错，Job 都不会失败**，只在日志中看到警告。
  2. **Validate JSON schemas syntax**  
     - 对 `schemas/*.json`、`schemas/v2/*.json` 跑  
       `python -c "import json; json.load(open('$schema'))"`。  
     - 使用 `set -e` → **只要有一个 schema 不是合法 JSON，该 step 失败，Job 失败**。

### 3.2 yamllint 具体做什么

- 检查 YAML **格式与风格**：缩进、尾随空格、重复 key、文档格式等。  
- **不**做 JSON Schema 校验，也**不**理解 `$schema` 或业务字段。  
- 与 validate.js 的关系：  
  - validate.js 的 `js-yaml` 已经保证「能解析」的 YAML 在**语法**上没问题。  
  - yamllint 相当于在**风格 / 可读性**上多一道检查，对 CI 的**通过/失败没有影响**（因 `continue-on-error`）。

### 3.3 Python `json.load` 具体做什么

- 只做 **JSON 语法** 校验：能否被 `json.load` 解析。  
- **不**做 JSON Schema 语义、`$ref` 解析、format 等。  
- 与 validate.js 的关系：  
  - validate.js 的 `loadSchema()` 已经对 `schemas/v1.json`、`schemas/v2/*.json` 等做了 `JSON.parse` 和简单结构检查。  
  - 因此 Python 这一步与 validate.js 在「schema 是否为合法 JSON」上有**重叠**；多跑一次相当于多一层防护，成本很低（无新依赖，只多一次 Python 调用）。

### 3.4 对 CI 的影响

| 步骤 | 失败时是否导致 Job 失败 | 说明 |
|------|--------------------------|------|
| Lint YAML (yamllint) | **否** | 仅日志；用于提早发现风格问题，不阻塞合入。 |
| Validate JSON schemas (Python) | **是** | 若某 `schemas/*.json` 或 `schemas/v2/*.json` 不是合法 JSON，Job 失败。 |

- 只有 **Python 的 JSON 语法检查** 会直接决定 Job 红/绿；yamllint 只影响日志内容。
- 若 validate.js 已先失败，这两个 step 不会执行；若 validate.js 通过，则：  
  - yamllint 跑完只产生告警；  
  - Python 再跑，schema 任一非法 JSON 仍会让 Job 失败。

---

## 四、两种方式之间的重叠与分工

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    validate.js                           │
                    │  · YAML 解析（js-yaml）→ 语法错误会失败                   │
                    │  · $schema 存在性与格式                                  │
                    │  · 对 schemas/v1.json、v2/*.json 的 JSON Schema 校验     │
                    │  · schemas 自身：JSON.parse + 简单结构 → 非法 JSON 会失败  │
                    └─────────────────────────────────────────────────────────┘
                                               │
                    失败 → Job 失败，后面 step 不跑
                    成功 ↓
    ┌──────────────────────────────────────────────────────────────────────────┐
    │  yamllint (continue-on-error)  │  Python json.load (set -e)              │
    │  · YAML 风格/格式              │  · schemas 的 JSON 语法                   │
    │  · 不导致 Job 失败             │  · 失败 → Job 失败                        │
    └──────────────────────────────────────────────────────────────────────────┘
```

- **YAML 语法**：由 validate.js 的 `js-yaml` 覆盖；yamllint 是**风格层面的补充**，且不参与 pass/fail。
- **YAML 的 JSON Schema 语义**：**仅** validate.js 做；yamllint 和 Python 都不做。
- **schemas/*.json 的「是否是合法 JSON」**：validate.js 的 `loadSchema` 与 Python 的 `json.load` **都做**；Python 相当于在已有 Node 校验之外的二次确认。

---

## 五、对 CI 的总体影响小结

| 维度 | 方式一（validate.js） | 方式二（yamllint + Python） |
|------|------------------------|-----------------------------|
| **能否导致 Job 失败** | 能；且是配置/schema 问题的**主要来源** | yamllint 不能；Python 能（仅限 schema 的 JSON 语法） |
| **执行顺序** | 先执行；失败则后续都不跑 | 后执行；依赖方式一通过才会跑到 |
| **在「配置是否符合 AI-Protocol 规范」上的作用** | 核心：$schema、字段、类型、format、枚举等 | 无；只做 YAML 风格和 schema 的 JSON 语法 |
| **依赖与耗时** | Node + `npm ci`（带缓存加速），主要耗时 | Python + yamllint；单次很快 |
| **与 package-lock.json 的关系** | 必须存在，`npm ci` 依赖它确保版本一致性 | 无关 |

结论：

- **能否通过 CI，主要由 validate.js 决定**：  
  - provider/model/example/spec 的 YAML 只要在格式或语义上不符合 schema，或 `$schema` 不符合约定，都会在这里失败。  
- **yamllint**：不改变通过/失败，只提供额外的 YAML 风格报告。  
- **Python 的 schema JSON 检查**：在 validate.js 已对 schema 做 `JSON.parse` 的前提下，属于**冗余防护**；若 validate.js 的 `--schemas` 已稳定覆盖所有 `schemas/*.json` 和 `schemas/v2/*.json`，理论上可删掉 Python 步骤以简化流水线，保留则多一道保险且成本很低。

---

## 六、构建机制说明

### 6.1 构建脚本 (`scripts/build.js`)

构建脚本负责将 YAML 源文件转换为 JSON 格式并输出到 `dist/` 目录。

**关键特性**：

- **dist 目录清理**：每次构建前自动清理 `dist/` 目录，防止陈旧文件残留
- **递归处理**：处理 `v1/` 和 `v2-alpha/` 目录下的所有 YAML 文件
- **索引生成**：自动生成 `dist/index.json` 包含版本信息

### 6.2 CI 中的构建

```yaml
- name: Build JSON artifacts
  run: npm run build
```

构建在验证通过后执行，生成的 `dist/` 目录作为 artifact 上传。

---

## 七、若希望简化或加强 CI 时的可选调整

1. **若认为 Python 的 schema JSON 检查与 validate.js 完全重复**：  
   - 可删除「Validate JSON schemas syntax」step，仅靠 validate.js 的 `loadSchema`；  
   - 好处：少一个 step，逻辑更集中；代价：少一道与实现无关的、仅依赖 Python 标准库的校验。

2. **若希望 yamllint 也能让 CI 失败**：  
   - 去掉 `continue-on-error: true`，并视需要为 `yamllint` 配置 `.yamllint` 收紧或放宽规则；  
   - 注意：yamllint 的规则若过严，可能会对现有合法 YAML 报错，需要一起调。
