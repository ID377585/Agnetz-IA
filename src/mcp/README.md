# MCP Gateway (MVP)

HTTP gateway that exposes a small set of connector tools with a single auth pattern and JSONL logs.

## Start
```bash
MCP_GATEWAY_TOKEN=change-me MCP_PORT=8788 node ./mcp-gateway.js
```

## Endpoints
- `GET /health` -> liveness
- `GET /ready` -> readiness
- `GET /tools` -> list connectors (requires auth)
- `POST /run` -> execute connector action (requires auth)

## Auth
If `MCP_GATEWAY_TOKEN` is set, every request to `/tools` and `/run` must include:
```
Authorization: Bearer <token>
```

## Connectors
Environment variables:
- `MCP_OLLAMA_URL` (default `http://localhost:11434`)
- `MCP_OLLAMA_MODEL` (default `mistral`)
- `MCP_NOTION_TOKEN`
- `MCP_NOTION_VERSION` (default `2022-06-28`)
- `MCP_TELEGRAM_TOKEN`
- `MCP_CHROME_WS` (Chrome DevTools WS URL)

## Logs
JSONL logs at `data/mcp.log`:
- `run_id`, `repo`, `env`, `event`, `ts`

## Example
```bash
curl -s -X POST http://localhost:8788/run \
  -H "Authorization: Bearer $MCP_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"connector":"ollama","action":"chat","input":{"messages":[{"role":"user","content":"hello"}]}}'
```
