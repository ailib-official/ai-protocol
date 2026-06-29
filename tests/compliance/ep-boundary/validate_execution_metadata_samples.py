#!/usr/bin/env python3
"""Validate cross-runtime ExecutionMetadata JSON samples against the v2 schema.

Usage (from ai-protocol repo):
  python tests/compliance/ep-boundary/validate_execution_metadata_samples.py
  python tests/compliance/ep-boundary/validate_execution_metadata_samples.py --protocol-root /path/to/ai-protocol
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load_schema(protocol_root: Path) -> dict:
    schema_path = protocol_root / "schemas" / "v2" / "execution-metadata.json"
    return json.loads(schema_path.read_text(encoding="utf-8"))


def _validate_with_fastjsonschema(schema: dict, instance: dict, label: str) -> None:
    try:
        import fastjsonschema
    except ImportError as exc:
        raise SystemExit(
            "fastjsonschema is required; pip install fastjsonschema"
        ) from exc
    validator = fastjsonschema.compile(schema)
    try:
        validator(instance)
    except fastjsonschema.JsonSchemaValueException as exc:
        raise ValueError(f"{label}: {exc}") from exc


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--protocol-root",
        type=Path,
        default=Path(__file__).resolve().parents[3],
        help="Path to ai-protocol repository root",
    )
    args = ap.parse_args()
    root = args.protocol_root.resolve()
    schema = _load_schema(root)
    samples_dir = root / "tests" / "compliance" / "fixtures" / "execution-metadata"
    if not samples_dir.is_dir():
        print(f"missing samples dir: {samples_dir}", file=sys.stderr)
        return 1

    samples = sorted(samples_dir.glob("*.json"))
    if not samples:
        print(f"no samples in {samples_dir}", file=sys.stderr)
        return 1

    errors: list[str] = []
    for path in samples:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            _validate_with_fastjsonschema(schema, data, path.name)
        except (json.JSONDecodeError, ValueError, OSError) as exc:
            errors.append(f"{path.name}: {exc}")

    if errors:
        print("execution-metadata samples: FAIL", file=sys.stderr)
        for line in errors:
            print(f"  {line}", file=sys.stderr)
        return 1

    print(f"execution-metadata samples: OK ({len(samples)} files validated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
