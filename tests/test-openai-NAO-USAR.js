import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: "Responda apenas: conexão com Agnetz.IA funcionando."
  });

  console.log(response.output_text);
}

run().catch(console.error);

