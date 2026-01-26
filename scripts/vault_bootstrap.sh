#!/usr/bin/env bash
set -euo pipefail

# Bootstrap Vault OSS (JWT auth for GitHub Actions + KV v2 + policies + roles).
# Requires VAULT_ADDR and VAULT_TOKEN with admin privileges.

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_KV_MOUNT="${VAULT_KV_MOUNT:-secret}"
VAULT_GH_REPO="${VAULT_GH_REPO:-ID377585/Agnetz-IA}"
ROLE_NAME="${ROLE_NAME:-agnetz-ci}"
JWT_PATH="${JWT_PATH:-jwt}"

export VAULT_ADDR

echo "Enabling JWT auth at auth/${JWT_PATH}..."
vault auth enable -path="${JWT_PATH}" jwt || true

echo "Configuring JWT auth..."
vault write "auth/${JWT_PATH}/config" \
  bound_issuer="https://token.actions.githubusercontent.com" \
  jwks_url="https://token.actions.githubusercontent.com/.well-known/jwks"

echo "Enabling KV v2 at ${VAULT_KV_MOUNT}..."
vault secrets enable -path="${VAULT_KV_MOUNT}" kv-v2 || true

cat > /tmp/agnetz-ci-policy.hcl <<EOF
path "${VAULT_KV_MOUNT}/metadata/agnetz/*" {
  capabilities = ["read","update","list"]
}
path "${VAULT_KV_MOUNT}/data/agnetz/*" {
  capabilities = ["read","list"]
}
EOF

echo "Writing policy ${ROLE_NAME}..."
vault policy write "${ROLE_NAME}" /tmp/agnetz-ci-policy.hcl

echo "Creating role ${ROLE_NAME}..."
vault write "auth/${JWT_PATH}/role/${ROLE_NAME}" \
  role_type="jwt" \
  user_claim="repository" \
  bound_audiences="https://github.com/${VAULT_GH_REPO}" \
  bound_subject="repo:${VAULT_GH_REPO}:ref:refs/heads/main" \
  policies="${ROLE_NAME}" \
  ttl="15m"

echo "Seeding example secrets metadata..."
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
exp=$(date -u -d "+90 days" +%Y-%m-%dT%H:%M:%SZ)

vault kv put "${VAULT_KV_MOUNT}/agnetz/prod" DATABASE_URL="postgres://..." API_KEY="REPLACE_ME"
vault kv metadata put "${VAULT_KV_MOUNT}/agnetz/prod" \
  -custom-metadata=rotation_days="90" \
  -custom-metadata=last_rotated="${now}" \
  -custom-metadata=expires_at="${exp}"

vault kv put "${VAULT_KV_MOUNT}/agnetz/staging" DATABASE_URL="postgres://..." API_KEY="REPLACE_ME"
vault kv metadata put "${VAULT_KV_MOUNT}/agnetz/staging" \
  -custom-metadata=rotation_days="90" \
  -custom-metadata=last_rotated="${now}" \
  -custom-metadata=expires_at="${exp}"

echo "Bootstrap complete."
