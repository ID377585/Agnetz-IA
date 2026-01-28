export function createOllamaConnector() {
  const baseUrl = process.env.MCP_OLLAMA_URL || "http://localhost:11434";
  const model = process.env.MCP_OLLAMA_MODEL || "mistral";

  return {
    name: "ollama",
    info: { baseUrl, model },
    async run(action, input) {
      if (action !== "chat") {
        throw new Error(`ollama: unsupported action ${action}`);
      }
      const body = {
        model,
        messages: input.messages || [],
      };
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`ollama: ${res.status} ${await res.text()}`);
      }
      return await res.json();
    },
  };
}
