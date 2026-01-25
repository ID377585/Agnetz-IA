# GitOps (ArgoCD) - k3d

Este diretório contém manifestos Kubernetes para rodar o app full-stack via GitOps usando ArgoCD em um cluster k3d.

## Estrutura

- `k8s/apps/generated-app`: manifests do app (backend, frontend, postgres, ingress)
- `k8s/argocd`: Application do ArgoCD

## Pré-requisitos

- k3d instalado
- kubectl
- ArgoCD instalado no cluster (namespace `argocd`)

## Passo a passo (k3d)

1) Criar cluster k3d (exemplo):

```
k3d cluster create agnetz \
  --agents 1 \
  --servers 1 \
  --registry-create agnetz-registry:0.0.0.0:5001 \
  -p "80:80@loadbalancer"
```

2) Instalar ArgoCD:

```
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

3) Subir as imagens locais para o k3d:

```
# Exemplo: build local
docker build -t generated-app-backend:latest ./python/generated-app/backend
docker build -t generated-app-frontend:latest ./python/generated-app/frontend

# Importar no k3d
k3d image import -c agnetz generated-app-backend:latest
k3d image import -c agnetz generated-app-frontend:latest
```

4) Ajustar `repoURL` do ArgoCD:

Edite `k8s/argocd/app-generated-app.yaml` e substitua `<REPO_URL>` pela URL do seu repositório.

5) Aplicar a Application do ArgoCD:

```
kubectl apply -f k8s/argocd/app-generated-app.yaml
```

6) Acessar o app:

O Ingress usa host `app.local`. Adicione no seu `/etc/hosts`:

```
127.0.0.1 app.local
```

Depois acesse `http://app.local`.

## Observações

- O backend executa migrações e seed no startup (idempotente).
- O banco usa `StatefulSet` com `local-path` (k3s).
- Para ambientes reais, use imagens em registry privado e secrets gerenciados.

## Ambientes (staging/prod)

- Staging: `k8s/overlays/staging`
- Prod: `k8s/overlays/prod`

Use o ArgoCD Applications:
- `k8s/argocd/app-generated-app-staging.yaml`
- `k8s/argocd/app-generated-app-prod.yaml`
- `k8s/argocd/app-argo-rollouts.yaml`

### Secrets

A base usa `ExternalSecret` em `k8s/apps/generated-app/externalsecret.yaml`.
Para opções de secret store e alternativas, veja `k8s/secrets/README.md`.
Para dev local, existe `k8s/apps/generated-app/secret.dev.example.yaml` como referência.

## Argo Rollouts

- Staging: canary com gates de análise (Prometheus/Datadog) e services `*-canary`.
- Prod: blue/green com `previewService` e análise antes da promoção.

Para habilitar:
- Instale o Argo Rollouts controller no cluster.
- Garanta que o CRD `Rollout` e `AnalysisTemplate` existam.
  
Observação:
- Os templates de análise usam métricas reais (Prometheus por padrão). Ajuste `address` e `query` conforme o seu stack.
