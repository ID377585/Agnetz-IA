#!/usr/bin/env node
import { createGateway } from "./src/mcp/gateway.js";

const port = Number(process.env.MCP_PORT || 8788);
const repo = process.env.MCP_REPO || "agnetz-ia";
const env = process.env.MCP_ENV || "local";

const gateway = createGateway({ repo, env });
gateway.start({ port });
