#!/usr/bin/env python3
"""Merge the managed oh-story Antigravity hook group atomically.

Antigravity's workspace hooks file is a top-level mapping of named hook groups.
story-setup owns only the ``oh-story`` key and preserves every user group.
"""

from __future__ import annotations

import argparse
import json
import os
import stat
import tempfile
from pathlib import Path
from typing import Any


class MergeError(ValueError):
    pass


def load_object(path: Path, *, missing_ok: bool) -> dict[str, Any]:
    if missing_ok and not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise MergeError(f"cannot read valid JSON object from {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise MergeError(f"expected a JSON object in {path}")
    return value


def merge(existing: dict[str, Any], template: dict[str, Any]) -> dict[str, Any]:
    managed = template.get("oh-story")
    if not isinstance(managed, dict):
        raise MergeError("template must contain an object-valued oh-story group")
    result = dict(existing)
    result["oh-story"] = managed
    return result


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o644
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        _commit(temporary, path, mode)
    finally:
        temporary.unlink(missing_ok=True)


def _commit(temporary: Path, path: Path, mode: int) -> None:
    """原子替换并保持既有权限（Windows 友好）。

    POSIX：先把权限落到临时文件，改名后新文件即带该权限（改名只受目录权限约束）。
    Windows：os.replace 无法覆盖「只读」目标，且 chmod 只映射只读位；故替换前先清掉
    目标的只读位，替换后再按原权限回写。官方 CI 仅跑 ubuntu，该分支不暴露。
    """
    if os.name != "nt":
        os.chmod(temporary, mode)
    elif path.exists():
        try:
            os.chmod(path, stat.S_IWRITE)
        except OSError:
            pass
    os.replace(temporary, path)
    if os.name == "nt":
        try:
            os.chmod(path, mode)
        except OSError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("existing", type=Path)
    parser.add_argument("template", type=Path)
    args = parser.parse_args()
    existing = load_object(args.existing, missing_ok=True)
    template = load_object(args.template, missing_ok=False)
    atomic_write(args.existing, merge(existing, template))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
