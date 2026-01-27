#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SELECTED="$ROOT_DIR/.agent/checklists/selected.yaml"

if [ ! -f "$SELECTED" ]; then
  echo "Missing $SELECTED"
  exit 1
fi

export ROOT_DIR
python3 - <<'PY'
import os, sys, pathlib, yaml

root = pathlib.Path(os.environ["ROOT_DIR"]).resolve()
selected = root / ".agent/checklists/selected.yaml"
data = yaml.safe_load(selected.read_text())
template = data.get("template")
completed = set(data.get("completed") or [])

if not template:
  print("selected.yaml missing template")
  sys.exit(1)

tpl_path = root / f".agent/checklists/{template}.yaml"
if not tpl_path.exists():
  print(f"template not found: {tpl_path}")
  sys.exit(1)

tpl = yaml.safe_load(tpl_path.read_text())
items = [i["id"] for i in (tpl.get("items") or [])]

missing = [i for i in items if i not in completed]
extra = [i for i in completed if i not in items]

if missing:
  print("Checklist incomplete. Missing:")
  for i in missing:
    print(f" - {i}")
  sys.exit(1)

if extra:
  print("Checklist has unknown completed items:")
  for i in extra:
    print(f" - {i}")
  sys.exit(1)

print(f"Checklist OK: {template} ({len(items)} items)")
PY
