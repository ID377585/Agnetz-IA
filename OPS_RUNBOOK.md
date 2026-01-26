# Runbook - Deploy 100% autônomo

## 1) GitOps repo

- Repositório criado: `https://github.com/ID377585/agnetz-gitops.git`.
- Conteúdo publicado a partir de `/Users/ivanescobar/Projetos/gitops`.

## 2) ArgoCD (auto-sync + auto-prune)

Aplique as Applications:

```
kubectl apply -f k8s/argocd/app-argo-rollouts.yaml
kubectl apply -f k8s/argocd/app-generated-app-staging.yaml
kubectl apply -f k8s/argocd/app-generated-app-prod.yaml
```

Essas Apps já estão com:
- `automated: { prune: true, selfHeal: true }`
- `CreateNamespace=true`

## 3) GitHub Environments

Crie os ambientes:
- `staging`
- `production`

No `production`, habilite aprovação obrigatória:
- Settings → Environments → production → Required reviewers

## 4) Auto-merge no GitOps repo

Habilite no GitHub:
- Settings → General → Pull Requests → Allow auto-merge
- (Opcional) Proteções de branch exigindo checks verdes

## 4.1) Secrets obrigatórios no repo de app (agnetz-ia)

- `GITOPS_REPO`: `ID377585/agnetz-gitops`
- `GITOPS_TOKEN`: token com acesso ao repo GitOps (ou configure GitHub App)
- `GITOPS_BRANCH_STAGING`: `staging`
- `GITOPS_BRANCH_PROD`: `main`
- `GITOPS_PATH_STAGING`: `k8s/overlays/staging`
- `GITOPS_PATH_PROD`: `k8s/overlays/prod`

## 5) Secrets / OIDC (sem long-lived)

- Configure OIDC no GitHub e no provedor (AWS/Vault/GCP).
- Use OIDC para obter credenciais temporárias no CI.

## 7) Politicas de secrets (rotacao e break-glass)

- Rotacao e alertas: `gitops/k8s/secrets/ROTATION_POLICY.md`
- Break-glass: `gitops/k8s/secrets/BREAK_GLASS.md`

## 8) Audit de rotacao (CI)

- Workflow: `.github/workflows/secrets-rotation-audit.yml`
- Variaveis: `SECRET_PROVIDER`, `SECRETS_LIST`, `AWS_REGION`
- Secret: `AWS_ROLE_ARN` (OIDC)

## 9) GCP Secret Manager (rotacao + alertas)

Configure:
- `SECRET_PROVIDER=gcp`
- `GCP_PROJECT` (vars)
- `SECRETS_LIST` (vars, ids separados por virgula)
- `GCP_WORKLOAD_IDENTITY_PROVIDER` (secret)
- `GCP_SERVICE_ACCOUNT` (secret)

Workflow para configurar rotacao:
- `.github/workflows/secrets-rotation-setup-gcp.yml`

## 10) Vault (rotacao + alertas)

Configure:
- `SECRET_PROVIDER=vault`
- `VAULT_ADDR` (vars)
- `VAULT_NAMESPACE` (vars, opcional)
- `VAULT_KV_MOUNT` (vars, ex: secret)
- `SECRETS_LIST` (vars, paths relativos ao mount)
- `VAULT_ROLE` (secret)
- `VAULT_JWT_AUTH_PATH` (secret, ex: jwt)

Workflow para configurar rotacao:
- `.github/workflows/secrets-rotation-setup-vault.yml`

Notas:
- GitHub-hosted runners **nao** acessam `localhost`. Para Vault OSS local, use runner self-hosted ou exponha o Vault via URL publica/TLS.

Bootstrap local (Vault OSS):
- `scripts/vault_dev_start.sh`
- `scripts/vault_bootstrap.sh`

## 6) Smoke test (opcional)

Se quiser validar staging antes de promover:
- Configure o secret `STAGING_SMOKE_BASE_URL`.
