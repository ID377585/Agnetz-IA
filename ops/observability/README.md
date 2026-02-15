Observability stack (MVP)

Start:
- `docker compose -f ops/observability/docker-compose.yml up -d`

Agent:
- `OTEL_ENABLED=1 OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces agnetz --serve`
- Metrics: `http://localhost:8787/metrics.prom`
- Health: `http://localhost:8787/health`
- Ready: `http://localhost:8787/ready`

Notes:
- Use `AGNETZ_OBS_PORT` to change the port (default 8787).

Prometheus:
- `http://localhost:9090`

Grafana:
- `http://localhost:3000` (admin/admin)
- Dashboard provisioned automatically under folder "Agnetz.IA"
