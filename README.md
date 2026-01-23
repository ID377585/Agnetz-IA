# Agnetz.IA

Assistente local com Ollama (Node.js) + orquestrador Python para geracao de projetos full-stack.

## Orquestrador Python (novo)

### Requisitos
- Python 3.10+
- Ollama rodando em `http://localhost:11434`

### Instalacao
```bash
cd python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Uso
```bash
python main.py --request "Crie um app full-stack com autenticacao simples"
```

Rodar testes no sandbox Docker apos gerar:
```bash
python main.py --request "..." --run-tests
```

### Variaveis de ambiente
Arquivo exemplo: `python/.env.example`
- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `llama3.1`)
- `OUTPUT_DIR` (default: `generated-app`)

### Templates (stack padrao)
O orquestrador copia templates base antes de gerar arquivos com o modelo.
Para desativar ou sobrescrever:
```bash
python main.py --request "..." --no-templates
python main.py --request "..." --overwrite
```

### Secrets (env / dotenv / AWS / Vault / GitHub)
Carregar secrets sem exibir valores e gerar arquivos/integcoes:
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
