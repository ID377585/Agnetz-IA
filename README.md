**Agnetz.IA**

Assistente local com Ollama + CLI Node.js + orquestrador Python para criar apps completos e operar ferramentas via MCP.

**Componentes**
- CLI `agnetz` (Node.js) para chat, geracao de apps, utilitarios e execucao segura.
- Orquestrador Python para gerar apps completos (web, API, CLI, GUI), incluindo Django quando solicitado.
- MCP Gateway para conectar ferramentas (Ollama, Notion, Telegram, Chrome, WhatsApp).
- Desktop (Electron) para chat, acoes rapidas e geracao visual.
- Backend/Frontend de referencia e templates auxiliares.

**Como Rodar (CLI)**
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
- `--plan`, `--plan-show`, `--execute` para planejamento e execucao segura.
- `--read`, `--write`, `--validate-json` para utilidades de arquivos.
- `--summarize`, `--extract-facts` para resumo e fatos de arquivos.
- `--csv-read`, `--csv-summary`, `--csv-analyze` para analise de CSV.
- `--mcp-tools`, `--mcp-run`, `--mcp-navigate`, `--mcp-screenshot`, `--mcp-eval`, `--mcp-content`.
- `--serve` para endpoints de observabilidade e metricas.
- `--reset`, `--summary` para memoria/resumo local.

**Orquestrador Python**
```bash
cd python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py --request "Crie um app full-stack com autenticacao simples"
```
- `--run-tests` e `--autofix` existem, mas ainda sao placeholders.

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
