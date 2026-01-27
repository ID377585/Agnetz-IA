#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v conftest >/dev/null 2>&1; then
  echo "Installing conftest..."
  curl -sSfL https://raw.githubusercontent.com/open-policy-agent/conftest/master/install.sh | sh -s -- -b /usr/local/bin
fi

TARGETS=(
  "$ROOT_DIR/k8s/apps/generated-app"
  "$ROOT_DIR/k8s/overlays/staging"
  "$ROOT_DIR/k8s/overlays/prod"
)

conftest test \
  --policy "$ROOT_DIR/policy/k8s" \
  --all-namespaces \
  --exclude 'k8s/overlays/prod/flux-system/*' \
  "${TARGETS[@]}"
