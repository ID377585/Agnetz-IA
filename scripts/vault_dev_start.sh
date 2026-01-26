#!/usr/bin/env bash
set -euo pipefail

# Start Vault in dev mode for local testing.
# This is NOT production-safe.

export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
export VAULT_DEV_ROOT_TOKEN_ID="${VAULT_DEV_ROOT_TOKEN_ID:-root}"

nohup vault server -dev -dev-root-token-id="${VAULT_DEV_ROOT_TOKEN_ID}" -dev-listen-address="127.0.0.1:8200" > /tmp/vault-dev.log 2>&1 &
echo $! > /tmp/vault-dev.pid

echo "Vault dev started (pid=$(cat /tmp/vault-dev.pid))."
echo "Export VAULT_ADDR=${VAULT_ADDR}"
echo "Export VAULT_TOKEN=${VAULT_DEV_ROOT_TOKEN_ID}"
