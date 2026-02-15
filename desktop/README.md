# Agnetz.IA Desktop (MVP)

Interface desktop para conectar ao backend da Agnetz.IA, ao MCP Gateway e acionar o orquestrador Python.

## Como rodar
```bash
cd desktop
npm install
npm start
```

## Geracao de apps
- O desktop chama `python/main.py` com o pedido do usuario.
- A saida vai para `generated-apps/<slug>`.
- Para Django, o desktop gera o projeto, mas nao cria `.venv` nem roda migrations automaticamente.

## Configuração
Na lateral esquerda, configure:
- Backend URL (ex.: http://localhost:8787)
- MCP URL (ex.: http://localhost:8788)
- Token MCP (Bearer)
- Modelo Ollama (ex.: mistral, llama3.1)

## Recursos
- Chat em tempo real (via MCP -> Ollama)
- Histórico salvo localmente
- Ações rápidas (deploy/rollback/MCP)
- Status do agente e do gateway
- Fila de tarefas
- Anexos (armazenados localmente, envio pendente no backend)
- Start/stop do MCP Gateway e do MCP Chrome
- Reinicio do backend diretamente pela UI
- Logs locais no arquivo `agnetz-main.log` (pasta de dados do app)

## Observação
As ações rápidas enviam POST para `/actions/<tipo>` no backend.
Se ainda não existir, o app mostrará a falha e manterá o histórico.

Para o MCP Gateway usar um modelo específico, suba o gateway com:
```bash
MCP_OLLAMA_MODEL=llama3.1 node ./mcp-gateway.js
```
