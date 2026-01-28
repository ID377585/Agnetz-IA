#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v conftest >/dev/null 2>&1; then
  echo "Installing conftest..."
  VERSION="0.56.0"
  OS="$(uname -s)"
  ARCH="$(uname -m)"
  if [ "$ARCH" = "x86_64" ]; then ARCH="x86_64"; fi
  if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then ARCH="arm64"; fi
  URL="https://github.com/open-policy-agent/conftest/releases/download/v${VERSION}/conftest_${VERSION}_${OS}_${ARCH}.tar.gz"
  curl -sSfL "$URL" | tar -xz -C /tmp
  install -m 0755 /tmp/conftest /usr/local/bin/conftest
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
