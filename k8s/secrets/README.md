# Secrets (External Secrets / SealedSecrets / SOPS)

Escolha UMA abordagem:

## 0) External Secrets Operator (recomendado)

- Instale o External Secrets Operator no cluster.
- Configure um `ClusterSecretStore` (AWS SM, Vault, GCP SM, etc.).
- O app usa `ExternalSecret` em `k8s/apps/generated-app/externalsecret.yaml`.

Exemplo de `ClusterSecretStore` (AWS SM com IRSA) — ajuste para o seu provedor:
```
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: primary-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

### Datadog (opcional, para AnalysisTemplate)

Se usar os templates `*-smoke-dd`, crie um Secret no namespace do app:
```
apiVersion: v1
kind: Secret
metadata:
  name: datadog-keys
type: Opaque
stringData:
  api-key: "<DATADOG_API_KEY>"
  app-key: "<DATADOG_APP_KEY>"
```

## 1) SealedSecrets (Bitnami)

- Instale o controller no cluster.
- Crie Secret normal e sele com `kubeseal`.

Exemplo:
```
# secret.yaml (local)
kubectl -n agnetz-prod create secret generic app-secrets \
  --from-literal=DATABASE_URL="..." \
  --from-literal=API_KEY="..." \
  --dry-run=client -o yaml > secret.yaml

# gerar sealedsecret
kubeseal --format=yaml --namespace agnetz-prod < secret.yaml > sealedsecret.yaml
```

Aplique o `sealedsecret.yaml` via GitOps.

## 2) SOPS (p/ GitOps com segredos versionados)

- Configure `.sops.yaml` na raiz
- Use `age`/`gpg` para criptografar

Exemplo:
```
# gerar arquivo criptografado
sops -e k8s/overlays/prod/secret-prod.yaml > k8s/overlays/prod/secret-prod.enc.yaml
```

No ArgoCD, use plugin SOPS ou `argocd-vault-plugin`.
