#!/usr/bin/env bash
set -euo pipefail

DECISION=${1:-}
if [ -z "$DECISION" ]; then
  echo "Usage: scripts/accept_decision.sh \"decision text\""
  exit 1
fi

FILE=".agent/accepted-decisions.yaml"
if [ ! -f "$FILE" ]; then
  echo "Missing $FILE"
  exit 1
fi

DATE_UTC=$(date -u +"%Y-%m-%d")

# Append in a predictable YAML shape that matches the existing file.
{
  echo ""
  echo "  - date: \"$DATE_UTC\""
  echo "    decision: \"$DECISION\""
} >>"$FILE"

echo "Appended decision to $FILE"
