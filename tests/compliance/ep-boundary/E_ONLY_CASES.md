# E-only compliance subset (PT-067)

Core-only (execution layer) runs **do not** load contact/policy modules. This
document lists **compliance case files** that are valid for that subset.

## Included directories

| Directory | Notes |
|-----------|--------|
| `cases/01-protocol-loading/` | Manifest load / validation |
| `cases/02-error-classification/` | HTTP → standard code mapping |
| `cases/03-message-building/` | Message construction |
| `cases/04-streaming/` | SSE decode, event mapping |
| `cases/05-request-building/` | Request normalization |
| `cases/07-advanced-capabilities/` | Capability guard + endpoint mapping |
| `cases/08-generative-capabilities/` | Generative capability matrix |
| `cases/09-credential-resolution/` | BYOK credential lookup and auth attachment metadata (no network calls) |
| `cases/10-text-tool-call/` | Text tool call parse / prompt (E-layer) |
| `cases/11-content-block-encoding/` | Content block encoding + contract schema (E-layer) |

## Excluded (require P or policy semantics)

| Path | Reason |
|------|--------|
| `cases/06-resilience/retry-policy.yaml` | `retry_decision` / policy-driven retry budgets — **P** |

Future E-layer tests for **bounded micro-retry** (1–2 transport retries) should
live under a dedicated case file tagged `execution`, not `policy`.

## Runners

Each runtime’s compliance runner should accept an environment variable or flag
such as `COMPLIANCE_SUBSET=e_only` that restricts discovery to the included
directories above.

**Static import boundary (Python):** from the ai-lib-python repo,
`pytest tests/architecture/test_execution_layer_import_boundary.py` reads
`module-matrix.yaml` and fails if any `python.execution_layer` package imports
`ai_lib_python.<contact>`. From ai-protocol:
`python tests/compliance/ep-boundary/check_ep_boundary.py --python-root /path/to/ai-lib-python`.
