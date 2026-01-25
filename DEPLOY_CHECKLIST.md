# Checklist 100% Autonomia - Agnetz

## 1) CI/CD completo
- [x] Build multi-arch com Buildx
- [x] SBOM + scan (Trivy) como gate
- [x] Release semântico com tags vX.Y.Z e vX.Y.Z-rc.N
- [x] Imagens publicadas no registry (GHCR)
- [x] GitOps atualizado com digest (imutável) + tag (UX)
- [x] ArgoCD/Flux sincroniza automaticamente

## 2) Secrets reais
- [x] External Secrets Operator (ou alternativa) como fonte única
- [x] .env apenas local (nunca no cluster)
- [x] CI sem secret em prompt (apenas nomes/refs)

## 3) Ambientes
- [x] Staging e prod separados (overlays/branches)
- [x] Promoção controlada (staging → prod) com tag idêntica
- [x] Rollback por tag anterior (1 clique)
- [x] Smoke test em staging antes da promoção

## 4) Governança
- [x] Environment "production" com aprovação no GitHub
- [x] Change-freeze por janela (opcional via secrets)
- [x] Audit trail via PRs no GitOps
- [x] GitHub App token para GitOps (sem PAT)

## 5) Progressive delivery
- [x] Argo Rollouts (canary em staging)
- [x] Argo Rollouts (blue/green em prod)
- [x] Gates de análise automática

## Status final
- 100% OK
