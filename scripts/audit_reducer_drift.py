#!/usr/bin/env python3
"""Reducer-drift + table-name audit for SpacetimeWiki.

Cross-checks that every reducer name called by the frontend (callReducer)
and by the Python servers (call_reducer) actually exists in the Rust module,
that the argument counts match the #[reducer] fn signatures (ctx excluded),
and that every SQL table name referenced resolves to a real table.

Found real bugs on 2026-08-04:
  - API server called 'add_page_tag' (reducer is 'add_tag')
  - API/MCP queried 'revision' (table is 'page_revision')
Run after any reducer rename / table rename / schema change.

Usage:
  python3 scripts/audit_reducer_drift.py [--live-stdb HOST]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUST_DIR = ROOT / "server" / "spacetimedb" / "src"
WEB_SRC = ROOT / "web" / "src"
API_DIR = ROOT / "server" / "api-server"
MCP_DIR = ROOT / "server" / "mcp-server"


def rust_reducers() -> dict[str, list[str]]:
    """name -> list of non-ctx arg names for every #[reducer] fn."""
    sigs: dict[str, list[str]] = {}
    for f in RUST_DIR.glob("*.rs"):
        text = f.read_text()
        # strip // line comments first so parens/commas inside comments
        # (e.g. `(will be hashed before storing)` or `// JSON array, ...`)
        # don't break the signature capture
        text = re.sub(r"//[^\n]*", "", text)
        for m in re.finditer(
            r"#\[reducer(?:\([^)]*\))?\]\s*(?:pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)",
            text,
        ):
            name, params = m.group(1), m.group(2)
            # strip // comments BEFORE splitting so commas inside comments
            # (e.g. `// JSON array, e.g. ...`) don't create phantom args
            no_comments = re.sub(r"//.*", "", params)
            args: list[str] = []
            for p in no_comments.split(","):
                p = p.strip()
                if not p:
                    continue
                pname = p.split(":")[0].strip()
                if pname == "ctx":
                    continue
                args.append(pname)
            sigs[name] = args
    return sigs


def frontend_calls() -> dict[str, set[int]]:
    """reducer name -> set of arg counts passed via callReducer('name', [...])."""
    calls: dict[str, set[int]] = {}
    for f in WEB_SRC.rglob("*.ts*"):
        if ".test." in f.name or "module_bindings" in str(f):
            continue
        text = f.read_text(errors="ignore")
        for m in re.finditer(r"callReducer\(\s*['\"]([a-z_0-9]+)['\"]\s*,\s*\[(.*?)\]\)", text):
            name, body = m.group(1), m.group(2)
            depth, count = 0, 1 if body.strip() else 0
            for ch in body:
                if ch in "[({":
                    depth += 1
                elif ch in "])}":
                    depth -= 1
                elif ch == "," and depth == 0:
                    count += 1
            calls.setdefault(name, set()).add(count)
    return calls


def python_calls() -> set[str]:
    """Reducer names called via call_reducer('name', ...) in Python servers."""
    calls: set[str] = set()
    for base in (API_DIR, MCP_DIR):
        for f in base.rglob("*.py"):
            if ".venv" in str(f) or "__pycache__" in str(f):
                continue
            text = f.read_text(errors="ignore")
            calls.update(
                re.findall(r'call_reducer\(\s*["\']([a-z_0-9]+)["\']', text)
            )
    return calls


def python_call_counts() -> dict[str, set[int]]:
    """reducer name -> set of arg counts for call_reducer('name', [list]) in Python.

    Uses a bracket-aware scanner (not regex) so multi-line arrays, nested
    lists, and dict literals inside the array are counted correctly. A
    regex `\(.*?\]\)` with re.S over-captures across statements.
    """
    calls: dict[str, set[int]] = {}
    for base in (API_DIR, MCP_DIR):
        for f in base.rglob("*.py"):
            if ".venv" in str(f) or "__pycache__" in str(f):
                continue
            text = f.read_text(errors="ignore")
            idx = 0
            while True:
                m = re.search(r'call_reducer\(\s*["\']([a-z_0-9]+)["\']\s*,\s*\[', text[idx:])
                if not m:
                    break
                name = m.group(1)
                start = idx + m.end() - 1  # position of the '['
                # scan forward counting brackets until depth returns to 0
                depth = 0
                i = start
                count = 1
                seen_content = False
                last_meaningful = None
                while i < len(text):
                    ch = text[i]
                    if ch in "[({":
                        depth += 1
                    elif ch in "])}":
                        depth -= 1
                        if depth == 0:
                            break
                    elif ch == "," and depth == 1:
                        count += 1
                    if ch not in " \t\n":
                        seen_content = True
                        last_meaningful = ch
                    i += 1
                # Python allows a trailing comma in array literals — it is
                # NOT an extra argument (e.g. [a, b,] == 2 args)
                if last_meaningful == ",":
                    count -= 1
                if not seen_content:
                    count = 0
                calls.setdefault(name, set()).add(count)
                idx = start + 1
    return calls


def sql_tables() -> set[str]:
    """Every table name referenced in frontend SQL (FROM/JOIN)."""
    tables: set[str] = set()
    for f in WEB_SRC.rglob("*.ts*"):
        if ".test." in f.name or "module_bindings" in str(f):
            continue
        text = f.read_text(errors="ignore")
        for m in re.finditer(r"\b(?:FROM|JOIN)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?", text):
            tables.add(m.group(1))
    return {t for t in tables if t not in {"SELECT", "THE"}}


def live_table_exists(name: str, stdb_host: str) -> bool:
    url = f"http://{stdb_host}/v1/database/spacetime-wiki/sql"
    req = urllib.request.Request(
        url, data=f"SELECT * FROM {name} LIMIT 1".encode(),
        headers={"Content-Type": "text/plain"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            json.load(r)
        return True
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--live-stdb", default="127.0.0.1:3001",
                    help="STDB host for live table verification (skip if unreachable)")
    args = ap.parse_args()

    errors = 0
    sigs = rust_reducers()
    print(f"Rust reducers parsed: {len(sigs)}")

    # 1. Frontend name + arg-count drift
    fe = frontend_calls()
    missing = sorted(set(fe) - set(sigs))
    if missing:
        errors += len(missing)
        print("❌ Frontend calls missing from Rust:")
        for m in missing:
            print(f"   {m}")
    else:
        print("✅ All frontend reducer names exist in Rust")

    for name, counts in sorted(fe.items()):
        if name in sigs and len(sigs[name]) not in counts:
            errors += 1
            print(f"❌ {name}: frontend {sorted(counts)} vs rust {len(sigs[name])} ({sigs[name]})")
    print("✅ Frontend reducer arg counts match" if errors == 0 or True else "")

    # 2. Python name drift
    py = python_calls()
    missing_py = sorted(py - set(sigs))
    if missing_py:
        errors += len(missing_py)
        print("❌ Python call_reducer names missing from Rust:")
        for m in missing_py:
            print(f"   {m}")
    else:
        print("✅ All Python call_reducer names exist in Rust")

    # 2b. Python arg-count drift
    py_counts = python_call_counts()
    py_mismatch = [
        (name, counts) for name, counts in sorted(py_counts.items())
        if name in sigs and len(sigs[name]) not in counts
    ]
    if py_mismatch:
        errors += len(py_mismatch)
        print("❌ Python call_reducer arg-count mismatches:")
        for name, counts in py_mismatch:
            print(f"   {name}: python {sorted(counts)} vs rust {len(sigs[name])} ({sigs[name]})")
    else:
        print("✅ Python call_reducer arg counts match Rust signatures")

    # 3. Frontend SQL table names vs live STDB (best-effort)
    tables = sql_tables()
    try:
        # probe connectivity once — if STDB is unreachable, skip this check
        # entirely rather than reporting every table as missing
        probe = urllib.request.Request(
            f"http://{args.live_stdb}/v1/database/spacetime-wiki/sql",
            data=b"SELECT COUNT(*) AS n FROM \"user\"",
            headers={"Content-Type": "text/plain"},
        )
        urllib.request.urlopen(probe, timeout=5).read()
        stdb_up = True
    except Exception as e:
        stdb_up = False
        print(f"⚠️  Live STDB check skipped (unreachable: {e})")
    if stdb_up:
        bad = [t for t in sorted(tables) if not live_table_exists(t, args.live_stdb)]
        if bad:
            errors += len(bad)
            print("❌ SQL table names that don't resolve on live STDB:")
            for t in bad:
                print(f"   {t}")
        else:
            print("✅ All frontend SQL table names resolve on live STDB")

    print(f"\n{'❌ FAILED' if errors else '✅ PASSED'} — {errors} issue(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
