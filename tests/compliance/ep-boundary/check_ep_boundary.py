#!/usr/bin/env python3
"""Static check: E-layer sources must not import P-layer modules (PT-067).

Usage (from ai-protocol repo):
  python tests/compliance/ep-boundary/check_ep_boundary.py --rust-root /path/to/ai-lib-rust
  python tests/compliance/ep-boundary/check_ep_boundary.py --python-root /path/to/ai-lib-python
  python tests/compliance/ep-boundary/check_ep_boundary.py --ts-root /path/to/ai-lib-ts
  python tests/compliance/ep-boundary/check_ep_boundary.py --go-root /path/to/ai-lib-go

Exit 0 if no forbidden imports; exit 1 with a report otherwise.
"""

from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path

# P-layer crate paths (forbidden inside static_check_roots in module-matrix.yaml)
FORBIDDEN = (
    r"crate::routing\b",
    r"crate::cache\b",
    r"crate::batch\b",
    r"crate::plugins\b",
    r"crate::tokens\b",
    r"crate::telemetry\b",
    r"crate::guardrails\b",
    r"crate::interceptors\b",
    r"crate::resilience\b",
)

_COMPILED = [(p, re.compile(p)) for p in FORBIDDEN]

# Python: keep in sync with module-matrix.yaml → python.execution_layer / python.contact
_PYTHON_EXECUTION = (
    "types",
    "errors",
    "drivers",
    "transport",
    "pipeline",
    "structured",
    "protocol",
    "registry",
    "utils",
    "mcp",
    "multimodal",
    "computer_use",
    "embeddings",
    "stt",
    "tts",
    "rerank",
    "feedback",
)
_PYTHON_CONTACT = (
    "routing",
    "cache",
    "batch",
    "plugins",
    "tokens",
    "telemetry",
    "guardrails",
    "resilience",
)

# TypeScript: keep in sync with module-matrix.yaml → typescript.execution_layer / typescript.contact
_TS_EXECUTION = (
    "types",
    "errors",
    "pipeline",
    "structured",
    "protocol",
    "mcp",
    "embeddings",
    "stt",
    "tts",
    "rerank",
    "multimodal",
    "computer_use",
)
_TS_CONTACT = (
    "routing",
    "cache",
    "batch",
    "plugins",
    "tokens",
    "telemetry",
    "guardrails",
    "resilience",
    "interceptors",
    "negotiation",
)

# Go: pure E trees (pkg/ailib is mixed — see module-matrix.yaml)
_GO_EXECUTION_DIRS = (
    "internal/protocol",
    "internal/stream",
)
_GO_CONTACT_IMPORT = (
    re.compile(r'"github\.com/ailib-official/ai-lib-go/pkg/contact'),
    re.compile(r'"github\.com/ailib-official/ai-lib-go/internal/resilience'),
)


def _python_contact_patterns() -> list[re.Pattern[str]]:
    alt = "|".join(re.escape(n) for n in _PYTHON_CONTACT)
    return [
        re.compile(rf"from\s+ai_lib_python\.({alt})\b"),
        re.compile(rf"import\s+ai_lib_python\.({alt})\b"),
    ]


def _ts_contact_patterns() -> list[re.Pattern[str]]:
    alt = "|".join(re.escape(n) for n in _TS_CONTACT)
    return [
        re.compile(rf"from\s+['\"](?:\.\./)*({alt})/"),
        re.compile(rf"from\s+['\"]@ailib-official/ai-lib-ts/contact['\"]"),
    ]


def scan_file(path: Path) -> list[tuple[int, str]]:
    hits: list[tuple[int, str]] = []
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        return [(0, f"<read error: {e}>")]
    for i, line in enumerate(text.splitlines(), start=1):
        for _pat, cre in _COMPILED:
            if cre.search(line):
                hits.append((i, line.strip()))
                break
    return hits


def _python_contact_set() -> frozenset[str]:
    return frozenset(_PYTHON_CONTACT)


def _is_type_checking_test(test: ast.expr) -> bool:
    if isinstance(test, ast.Name):
        return test.id == "TYPE_CHECKING"
    if isinstance(test, ast.Attribute):
        return test.attr == "TYPE_CHECKING"
    return False


def _type_checking_spans(module: ast.Module) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    for node in module.body:
        if not isinstance(node, ast.If) or not _is_type_checking_test(node.test):
            continue
        if not node.body:
            spans.append((node.lineno, node.lineno))
            continue
        start = node.body[0].lineno
        end = max(getattr(s, "end_lineno", s.lineno) for s in node.body)
        spans.append((start, end))
    return spans


def _lineno_in_spans(lineno: int, spans: list[tuple[int, int]]) -> bool:
    return any(start <= lineno <= end for start, end in spans)


def _contact_subpackage_from_ai_lib_python(module: str | None) -> str | None:
    if not module:
        return None
    parts = module.split(".")
    if len(parts) < 2 or parts[0] != "ai_lib_python":
        return None
    return parts[1]


def scan_python_client_no_static_contact(root: Path) -> list[tuple[Path, int, str]]:
    """`client/` must not statically import P-layer packages (except under `if TYPE_CHECKING:`)."""
    pkg = root / "src" / "ai_lib_python" / "client"
    contact = _python_contact_set()
    violations: list[tuple[Path, int, str]] = []
    if not pkg.is_dir():
        return violations
    for py_path in sorted(pkg.rglob("*.py")):
        try:
            src = py_path.read_text(encoding="utf-8")
        except OSError:
            continue
        try:
            tree = ast.parse(src, filename=str(py_path))
        except SyntaxError:
            continue
        spans = _type_checking_spans(tree)
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                if node.module and _lineno_in_spans(node.lineno, spans):
                    continue
                sub = _contact_subpackage_from_ai_lib_python(node.module)
                if sub in contact:
                    seg = ast.get_source_segment(src, node)
                    violations.append((py_path, node.lineno, (seg or "").strip()))
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    sub = _contact_subpackage_from_ai_lib_python(alias.name)
                    if sub in contact and not _lineno_in_spans(node.lineno, spans):
                        seg = ast.get_source_segment(src, node)
                        violations.append((py_path, node.lineno, (seg or "").strip()))
    return violations


def _scan_python_execution_trees(
    root: Path, patterns: list[re.Pattern[str]]
) -> list[tuple[Path, list[tuple[int, str]]]]:
    pkg = root / "src" / "ai_lib_python"
    bad: list[tuple[Path, list[tuple[int, str]]]] = []
    for name in _PYTHON_EXECUTION:
        tree = pkg / name
        if not tree.is_dir():
            continue
        for py_path in sorted(tree.rglob("*.py")):
            line_hits: list[tuple[int, str]] = []
            try:
                text = py_path.read_text(encoding="utf-8")
            except OSError as e:
                line_hits.append((0, f"<read error: {e}>"))
                bad.append((py_path, line_hits))
                continue
            for i, line in enumerate(text.splitlines(), start=1):
                stripped = line.split("#", 1)[0]
                if any(cre.search(stripped) for cre in patterns):
                    line_hits.append((i, line.strip()))
            if line_hits:
                bad.append((py_path, line_hits))
    return bad


def main() -> int:
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument(
        "--rust-root",
        type=Path,
        help="Path to ai-lib-rust repository root",
    )
    src.add_argument(
        "--python-root",
        type=Path,
        help="Path to ai-lib-python repository root",
    )
    src.add_argument(
        "--ts-root",
        type=Path,
        help="Path to ai-lib-ts repository root",
    )
    src.add_argument(
        "--go-root",
        type=Path,
        help="Path to ai-lib-go repository root",
    )
    args = ap.parse_args()

    if args.rust_root is not None:
        return _main_rust(args.rust_root.resolve())
    if args.ts_root is not None:
        return _main_typescript(args.ts_root.resolve())
    if args.go_root is not None:
        return _main_go(args.go_root.resolve())
    return _main_python(args.python_root.resolve())


def _rust_src_root(root: Path) -> Path:
    """Workspace layout: crates/ai-lib-core/src; legacy: src/."""
    core = root / "crates" / "ai-lib-core" / "src"
    if core.is_dir():
        return core
    return root / "src"


def _main_rust(root: Path) -> int:
    src = _rust_src_root(root)
    globs = [
        "types/**/*.rs",
        "protocol/**/*.rs",
        "drivers/**/*.rs",
        "transport/**/*.rs",
        "pipeline/**/*.rs",
        "structured/**/*.rs",
    ]
    files: list[Path] = []
    for g in globs:
        files.extend(src.glob(g))
    for name in ("error.rs", "error_code.rs"):
        p = src / name
        if p.is_file():
            files.append(p)

    bad: list[tuple[Path, list[tuple[int, str]]]] = []
    for f in sorted(set(files)):
        h = scan_file(f)
        if h:
            bad.append((f, h))

    if not bad:
        print(f"ep-boundary (rust): OK ({len(files)} files under E roots in {src})")
        return 0

    print("ep-boundary (rust): FORBIDDEN P-layer import in E-only roots:", file=sys.stderr)
    for path, hits in bad:
        try:
            rel = path.relative_to(src)
        except ValueError:
            rel = path
        print(f"  {rel}:", file=sys.stderr)
        for line_no, line in hits:
            print(f"    L{line_no}: {line}", file=sys.stderr)
    return 1


def _main_python(root: Path) -> int:
    patterns = _python_contact_patterns()
    bad = _scan_python_execution_trees(root, patterns)
    if bad:
        print("ep-boundary (python): FORBIDDEN contact-layer import in execution packages:", file=sys.stderr)
        for path, hits in bad:
            try:
                rel = path.relative_to(root)
            except ValueError:
                rel = path
            print(f"  {rel}:", file=sys.stderr)
            for line_no, line in hits:
                print(f"    L{line_no}: {line}", file=sys.stderr)
        return 1

    client_bad = scan_python_client_no_static_contact(root)
    if client_bad:
        print(
            "ep-boundary (python): FORBIDDEN static contact-layer import in client/ "
            "(use importlib or TYPE_CHECKING only):",
            file=sys.stderr,
        )
        for path, line_no, snippet in client_bad:
            try:
                rel = path.relative_to(root)
            except ValueError:
                rel = path
            print(f"  {rel}:L{line_no}: {snippet}", file=sys.stderr)
        return 1

    print(f"ep-boundary (python): OK (execution_layer + client/ under {root / 'src' / 'ai_lib_python'})")
    return 0


def _scan_typescript_tree(
    root: Path, rel_dir: str, patterns: list[re.Pattern[str]]
) -> list[tuple[Path, list[tuple[int, str]]]]:
    tree = root / "src" / rel_dir
    bad: list[tuple[Path, list[tuple[int, str]]]] = []
    if not tree.is_dir() and rel_dir.endswith(".ts"):
        candidates = [tree] if tree.is_file() else []
    elif tree.is_dir():
        candidates = sorted(tree.rglob("*.ts"))
    else:
        candidates = []
    for ts_path in candidates:
        line_hits: list[tuple[int, str]] = []
        try:
            text = ts_path.read_text(encoding="utf-8")
        except OSError as e:
            line_hits.append((0, f"<read error: {e}>"))
            bad.append((ts_path, line_hits))
            continue
        for i, line in enumerate(text.splitlines(), start=1):
            stripped = line.split("//", 1)[0]
            if any(cre.search(stripped) for cre in patterns):
                line_hits.append((i, line.strip()))
        if line_hits:
            bad.append((ts_path, line_hits))
    return bad


def _main_typescript(root: Path) -> int:
    patterns = _ts_contact_patterns()
    bad: list[tuple[Path, list[tuple[int, str]]]] = []
    for name in _TS_EXECUTION:
        bad.extend(_scan_typescript_tree(root, name, patterns))
    bad.extend(_scan_typescript_tree(root, "core.ts", patterns))
    bad.extend(_scan_typescript_tree(root, "client", patterns))

    if not bad:
        print(
            f"ep-boundary (typescript): OK (execution_layer + core.ts + client/ under {root / 'src'})"
        )
        return 0

    print(
        "ep-boundary (typescript): FORBIDDEN contact-layer import in execution surface:",
        file=sys.stderr,
    )
    for path, hits in bad:
        try:
            rel = path.relative_to(root)
        except ValueError:
            rel = path
        print(f"  {rel}:", file=sys.stderr)
        for line_no, line in hits:
            print(f"    L{line_no}: {line}", file=sys.stderr)
    return 1


def _main_go(root: Path) -> int:
    bad: list[tuple[Path, list[tuple[int, str]]]] = []
    files: list[Path] = []
    for rel in _GO_EXECUTION_DIRS:
        tree = root / rel
        if not tree.is_dir():
            continue
        files.extend(sorted(tree.rglob("*.go")))

    for go_path in files:
        line_hits: list[tuple[int, str]] = []
        try:
            text = go_path.read_text(encoding="utf-8")
        except OSError as e:
            line_hits.append((0, f"<read error: {e}>"))
            bad.append((go_path, line_hits))
            continue
        for i, line in enumerate(text.splitlines(), start=1):
            stripped = line.split("//", 1)[0]
            if any(cre.search(stripped) for cre in _GO_CONTACT_IMPORT):
                line_hits.append((i, line.strip()))
        if line_hits:
            bad.append((go_path, line_hits))

    if not bad:
        print(f"ep-boundary (go): OK ({len(files)} files under {', '.join(_GO_EXECUTION_DIRS)})")
        return 0

    print("ep-boundary (go): FORBIDDEN contact-layer import in E-only trees:", file=sys.stderr)
    for path, hits in bad:
        try:
            rel = path.relative_to(root)
        except ValueError:
            rel = path
        print(f"  {rel}:", file=sys.stderr)
        for line_no, line in hits:
            print(f"    L{line_no}: {line}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
