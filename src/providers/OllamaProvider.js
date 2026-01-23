export class OllamaProvider {
  constructor({ baseUrl = "http://localhost:11434", model = "mistral" } = {}) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages, options = {}) {
    const payload = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.4,
        top_p: options.top_p ?? 0.9,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `OllamaProvider.chat failed: ${res.status} ${res.statusText} ${text}`
      );
    }

    const data = await res.json();
    return data?.message?.content ?? "";
  }
}

