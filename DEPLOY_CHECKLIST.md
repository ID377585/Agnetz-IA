# Checklist 100% Autonomia - Agnetz

## 1) CI/CD completo
- [x] Workflow de build/test/e2e passa
- [x] Release gera tag semântica
- [x] Imagens publicadas no registry (GHCR/ECR/GAR)
- [x] Manifests GitOps atualizados com tag
- [x] ArgoCD sincroniza automaticamente

## 2) Secrets reais
- [x] Secrets configurados via SealedSecrets ou SOPS
- [x] .sops.yaml com chave AGE/GPG
- [x] Secrets removidos do git (somente sealed/enc)

## 3) Ambientes
- [x] Staging com overlays aplicado
- [x] Prod com overlays aplicado
- [x] Hostnames configurados
- [x] Promoção controlada (staging -> prod)

## 4) Governança
- [x] Environment "production" requer aprovação
- [x] Rollback manual funciona (workflow_dispatch)
- [x] Audit log atualizado em k8s/audit/approvals.log

## 5) RAG / Memória
- [x] Pastas indexadas (docs, apps, templates)
- [x] Estado salvo em .agnetz/state.yaml

## 6) Auto-fix
- [x] Loop plan→gen→test→fix roda sem travar
- [x] Limites de patch respeitados
- [x] Logs JSONL gerados

## Status final
- 100% OK
