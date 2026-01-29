# Agnetz.IA Desktop (MVP)

Interface desktop para conectar ao backend da Agnetz.IA e ao MCP Gateway.

## Como rodar
```bash
cd desktop
npm install
npm start
```

## Configuração
Na lateral esquerda, configure:
- Backend URL (ex.: http://localhost:8787)
- MCP URL (ex.: http://localhost:8788)
- Token MCP (Bearer)

## Recursos
- Chat em tempo real (via MCP -> Ollama)
- Histórico salvo localmente
- Ações rápidas (deploy/rollback/MCP)
- Status do agente e do gateway
- Fila de tarefas
- Anexos (armazenados localmente, envio pendente no backend)

## Observação
As ações rápidas enviam POST para `/actions/<tipo>` no backend.
Se ainda não existir, o app mostrará a falha e manterá o histórico.
