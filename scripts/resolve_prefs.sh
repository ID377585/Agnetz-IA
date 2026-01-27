#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_FILE="$ROOT_DIR/.agent/resolved.yaml"

has_file() {
  [ -f "$ROOT_DIR/$1" ]
}

has_path() {
  [ -e "$ROOT_DIR/$1" ]
}

detect_backend_runtime="unknown"
detect_backend_lang="unknown"
detect_frontend_framework="unknown"
detect_orm="unknown"
detect_validation="unknown"

if has_file "package.json"; then
  detect_backend_runtime="nodejs"
fi

if has_path "tsconfig.json" || has_path "backend/tsconfig.json"; then
  detect_backend_lang="typescript"
fi

if has_path "frontend"; then
  detect_frontend_framework="react"
fi

if has_path "backend/prisma/schema.prisma"; then
  detect_orm="prisma"
fi

if rg -n "\"zod\"" "$ROOT_DIR/package.json" >/dev/null 2>&1; then
  detect_validation="zod"
fi

# Accepted decisions become sticky defaults.
accepted_prisma=false
accepted_zod=false
accepted_gitops=false

if rg -n "Prisma" "$ROOT_DIR/.agent/accepted-decisions.yaml" >/dev/null 2>&1; then
  accepted_prisma=true
fi
if rg -n "Zod" "$ROOT_DIR/.agent/accepted-decisions.yaml" >/dev/null 2>&1; then
  accepted_zod=true
fi
if rg -n "ArgoCD|External Secrets|Vault" "$ROOT_DIR/.agent/accepted-decisions.yaml" >/dev/null 2>&1; then
  accepted_gitops=true
fi

resolved_orm="$detect_orm"
resolved_validation="$detect_validation"
resolved_gitops="unknown"

if [ "$accepted_prisma" = true ]; then
  resolved_orm="prisma"
fi
if [ "$accepted_zod" = true ]; then
  resolved_validation="zod"
fi
if [ "$accepted_gitops" = true ]; then
  resolved_gitops="argocd+external-secrets+vault"
fi

accepted_list="$(sed -n 's/^    decision: \"\(.*\)\"$/  - \"\1\"/p' "$ROOT_DIR/.agent/accepted-decisions.yaml")"

mkdir -p "$ROOT_DIR/.agent"

cat >"$OUT_FILE" <<EOF
version: 1
generated_at_utc: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

sources:
  preferences: ".agent/preferences.yaml"
  team: "prefs/team.yaml"
  ivan: "prefs/ivan.yaml"
  accepted_decisions: ".agent/accepted-decisions.yaml"

detected_stack:
  backend:
    runtime: "$detect_backend_runtime"
    language: "$detect_backend_lang"
    orm: "$detect_orm"
    validation: "$detect_validation"
  frontend:
    framework: "$detect_frontend_framework"

resolved_defaults:
  backend:
    runtime: "nodejs"
    language: "typescript"
    framework: "express"
    orm: "$resolved_orm"
    validation: "$resolved_validation"
  infra:
    gitops_bundle: "$resolved_gitops"
  ci:
    release: "semantic-release"

accepted_decisions:
$accepted_list
EOF

echo "Wrote $OUT_FILE"
