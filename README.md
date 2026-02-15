# Agnetz.IA

Assistente local com Ollama + CLI Node.js + orquestrador Python para criar apps completos e operar ferramentas via MCP.

**Componentes**
- CLI `agnetz` (Node.js) para chat, geracao de apps, utilitarios e execucao segura.
- Orquestrador Python para gerar apps completos (web, API, CLI, GUI), incluindo Django quando solicitado.
- MCP Gateway para conectar ferramentas (Ollama, Notion, Telegram, Chrome, WhatsApp).
- Desktop (Electron) para chat, acoes rapidas e geracao visual.
- Backend/Frontend de referencia e templates auxiliares.

**Inicio Rapido (CLI)**
```bash
npm install
node ./agnetz.js "criar um app de notas web"
```

**Geracao de Apps (automatica no CLI)**
- Quando o pedido indica criacao de app, o CLI chama o orquestrador automaticamente.
- Saida padrao em `generated-apps/<slug>` ou no caminho definido por `AGNETZ_GENERATED_DIR`.
- Tipos suportados: web, API, CLI, GUI e calculadora.
- Stack padrao quando nao especificado: web.
- Geracao por LLM ativada por padrao (desative com `AGNETZ_LLM_GENERATION=0`).

**Django (via CLI)**
```bash
./agnetz "criar um app de notas feito com o framework Django"
```
- Cria `.venv`, instala dependencias, roda migrations e inicia `runserver`.
- Log em `generated-apps/<slug>/django-setup.log`.
- Superusuario automatico via env:
- `DJANGO_SUPERUSER_USERNAME`
- `DJANGO_SUPERUSER_PASSWORD`
- `DJANGO_SUPERUSER_EMAIL` (opcional)

**Funcoes do CLI**
- Chat local com Ollama.
- Planejamento e execucao segura: `--plan`, `--plan-show`, `--execute`.
- Utilitarios de arquivos: `--read`, `--write`, `--validate-json`.
- Resumo e fatos: `--summarize`, `--extract-facts`.
- CSV: `--csv-read`, `--csv-summary`, `--csv-analyze`.
- MCP: `--mcp-tools`, `--mcp-run`, `--mcp-navigate`, `--mcp-screenshot`, `--mcp-eval`, `--mcp-content`.
- Observabilidade: `--serve` (metrics, health, ready).
- Memoria local: `--reset`, `--summary`.

**Orquestrador Python**
```bash
cd python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py --request "Crie um app full-stack com autenticacao simples"
```
- `--run-tests` e `--autofix` existem, mas ainda sao placeholders.
- RAG: `--rag-index`, `--rag-query`, `--rag-use`, `--rag-topk`.
- Templates: `--no-templates`, `--overwrite`.

**Secrets (env / dotenv / AWS / Vault / GitHub)**
```bash
# 1) Dotenv -> k8s secret + sops
python main.py --secrets-provider dotenv \
  --secrets-dotenv .env \
  --secrets-keys DATABASE_URL,API_KEY \
  --secrets-k8s-out k8s/overlays/prod/secret-prod.enc.yaml \
  --secrets-k8s-namespace agnetz-prod \
  --secrets-sops

# 2) AWS Secrets Manager -> .env
python main.py --secrets-provider aws \
  --secrets-path agnetz/prod \
  --secrets-region us-east-1 \
  --secrets-env-out backend/.env

# 3) Vault (KV v2) -> GitHub Secrets (requer gh CLI)
export VAULT_ADDR="http://127.0.0.1:8200"
export VAULT_TOKEN="s.xxxxx"
python main.py --secrets-provider vault \
  --secrets-path secret/data/agnetz/prod \
  --secrets-gh-repo ID377585/Agnetz-IA \
  --secrets-gh-env production
```

**MCP Gateway**
- Detalhes em `src/mcp/README.md`.

**Desktop**
- Detalhes em `desktop/README.md`.

**Observabilidade**
- Detalhes em `ops/observability/README.md`.

**K8s/GitOps**
- Detalhes em `k8s/README.md`.

**Variaveis Principais**
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OUTPUT_DIR`
- `AGNETZ_GENERATED_DIR`, `AGNETZ_ORCHESTRATOR`, `AGNETZ_LLM_GENERATION`, `AGNETZ_LLM_TEMPERATURE`
- `MCP_GATEWAY_URL`, `MCP_GATEWAY_TOKEN`, `MCP_CHROME_WS`
- `OTEL_ENABLED`, `AGNETZ_OBS_PORT`
