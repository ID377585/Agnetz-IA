import { OllamaProvider } from "../src/providers/OllamaProvider.js";
import { AgnetzIA } from "../src/AgnetzIA.js";

const provider = new OllamaProvider({ model: "mistral" });

const agnetz = new AgnetzIA({
  provider,
  systemPrompt: `
Você é o Agnetz.IA, um assistente técnico para desenvolvimento (Node.js, automações, APIs e IA local).

REGRAS OBRIGATÓRIAS:
- Responda sempre em pt-BR.
- Seja direto e prático.
- Quando eu pedir "comando curl", você DEVE devolver um comando completo, pronto para copiar e colar.
- Use sempre URL real do Ollama local: http://localhost:11434
- Nunca invente domínio (ex.: api.exemplo.com).
- No system message do JSON, escreva em pt-BR (nunca "You are a helpful assistant").
`.trim(),
});

async function main() {
  const r1 = await agnetz.ask(
    "Me dê um comando curl COMPLETO para chamar http://localhost:11434/api/chat com o modelo mistral, com system em pt-BR e user dizendo 'Diga apenas: OK'. Quero o JSON inteiro dentro do -d."
  );
  console.log("\nResposta 1:\n", r1);

  const r2 = await agnetz.ask(
    "Explique como eu sei que funcionou: quais campos aparecem no JSON de resposta do Ollama e onde fica o texto retornado."
  );
  console.log("\nResposta 2:\n", r2);
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});

