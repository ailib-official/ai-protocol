#!/usr/bin/env python3
"""Static check: E-layer sources must not import P-layer modules (PT-067).

Usage (from ai-protocol repo):
  python tests/compliance/ep-boundary/check_ep_boundary.py --rust-root /path/to/ai-lib-rust
  python tests/compliance/ep-boundary/check_ep_boundary.py --python-root /path/to/ai-lib-python

Exit 0 if no forbidden imports; exit 1 with a report otherwise.
"""

from __future__ import annotations

import argparse
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


def _python_contact_patterns() -> list[re.Pattern[str]]:
    alt = "|".join(re.escape(n) for n in _PYTHON_CONTACT)
    return [
        re.compile(rf"from\s+ai_lib_python\.({alt})\b"),
        re.compile(rf"import\s+ai_lib_python\.({alt})\b"),
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
    args = ap.parse_args()

    if args.rust_root is not None:
        return _main_rust(args.rust_root.resolve())
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
    if not bad:
        print(f"ep-boundary (python): OK (execution_layer trees under {root / 'src' / 'ai_lib_python'})")
        return 0
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


if __name__ == "__main__":
    raise SystemExit(main())
