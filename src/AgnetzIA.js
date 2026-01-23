export class AgnetzIA {
  constructor({
    provider,
    name = "Agnetz.IA",
    language = "pt-BR",
    maxHistory = 12,
    systemPrompt,
  } = {}) {
    if (!provider) {
      throw new Error(
        "AgnetzIA precisa de um provider (ex.: new OllamaProvider(...))"
      );
    }

    this.provider = provider;
    this.name = name;
    this.language = language;
    this.maxHistory = maxHistory;

    // System prompt padrão (você pode trocar depois)
    this.systemPrompt =
      systemPrompt ??
      [
        `Você é o ${this.name}, um assistente técnico e objetivo.`,
        `Sempre responda em ${this.language}.`,
        `Se faltar contexto, faça no máximo 1 pergunta curta; caso contrário, dê uma solução prática.`,
        `Não invente fatos. Se não souber, diga que não tem como garantir e sugira como verificar.`,
      ].join("\n");

    // memória curta (histórico da conversa)
    this.history = [];
  }

  clearHistory() {
    this.history = [];
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = String(prompt ?? "");
  }

  _buildMessages(userText) {
    const messages = [
      { role: "system", content: this.systemPrompt },
      ...this.history,
      { role: "user", content: userText },
    ];

    // mantém só as últimas mensagens (fora o system)
    const keep = Math.max(0, this.maxHistory);
    const tail = messages.slice(Math.max(1, messages.length - keep));
    return [messages[0], ...tail];
  }

  async ask(userText, options = {}) {
    const messages = this._buildMessages(userText);

    const answer = await this.provider.chat(messages, options);

    // salva no histórico
    this.history.push({ role: "user", content: userText });
    this.history.push({ role: "assistant", content: answer });

    // corta histórico pra não crescer infinito
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(this.history.length - this.maxHistory);
    }

    return answer;
  }
}

