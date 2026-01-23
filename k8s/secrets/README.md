# Secrets (SealedSecrets / SOPS)

Escolha UMA abordagem:

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

## 2) SOPS (recomendado p/ GitOps)

- Configure `.sops.yaml` na raiz
- Use `age`/`gpg` para criptografar

Exemplo:
```
# gerar arquivo criptografado
sops -e k8s/overlays/prod/secret-prod.yaml > k8s/overlays/prod/secret-prod.enc.yaml
```

No ArgoCD, use plugin SOPS ou `argocd-vault-plugin`.
