#!/usr/bin/env bash
set -euo pipefail

# Simple semver bump (patch)
LATEST=$(git tag --list 'v*' --sort=-v:refname | head -n 1)
if [[ -z "$LATEST" ]]; then
  echo "v0.1.0"
  exit 0
fi

VER=${LATEST#v}
IFS='.' read -r MAJOR MINOR PATCH <<< "$VER"
PATCH=$((PATCH+1))

echo "v${MAJOR}.${MINOR}.${PATCH}"
