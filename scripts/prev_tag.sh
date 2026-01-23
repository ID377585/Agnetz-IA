#!/usr/bin/env bash
set -euo pipefail

TAGS=$(git tag --list 'v*' --sort=-v:refname)
PREV=$(echo "$TAGS" | sed -n '2p')
if [[ -z "$PREV" ]]; then
  echo ""
  exit 0
fi

echo "$PREV"
