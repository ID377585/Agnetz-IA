#!/usr/bin/env node
/**
 * Agnetz.IA CLI (ESM)
 * - provider: Ollama local
 * - memória curta: data/memory.json
 * - resumo de fatos: data/memory.summary.txt
 * - planos: data/last_plan.json
 * - CSV: src/csvSimple.js + src/csvMarkdown.js
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { execa } from "execa";

import { OllamaProvider } from "./src/providers/OllamaProvider.js";
import { AgnetzIA } from "./src/AgnetzIA.js";

import { readCsvAsJson, summarizeCsv } from "./src/csvSimple.js";
import { csvSummaryToMarkdown } from "./src/csvMarkdown.js";

// ==============================
// Paths / constants
// ==============================
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");
const SUMMARY_FILE = path.join(DATA_DIR, "memory.summary.txt");
const PLAN_FILE = path.join(DATA_DIR, "last_plan.json");

const MAX_TURNS_TO_KEEP = 10;

// ==============================
// Utils: fs
// ==============================
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, "[]", "utf-8");
  if (!fs.existsSync(SUMMARY_FILE)) fs.writeFileSync(SUMMARY_FILE, "", "utf-8");
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const txt = fs.readFileSync(filePath, "utf-8").trim();
    if (!txt) return fallback;
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf-8");
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content ?? "", "utf-8");
}

async function readStdinAll() {
  // lê stdin quando vem pipe (não TTY)
  if (process.stdin.isTTY) return "";
  return await new Promise((resolve, reject) => {
    let buf = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", reject);
  });
}

// ==============================
// Utils: memória/resumo
// ==============================
function lastMessages(history, max = MAX_TURNS_TO_KEEP) {
  const arr = Array.isArray(history) ? history : [];
  return arr.slice(-max);
}

function normalizeLines(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function upsertBullet(lines, prefix, value) {
  const out = [...lines];
  const idx = out.findIndex((l) => l.startsWith(prefix));
  const line = `${prefix}${value}`;
  if (idx >= 0) out[idx] = line;
  else out.push(line);
  return out;
}

// ==============================
// Utils: prompt confirm (execute)
// ==============================
async function askYesNo(question) {
  // Se não for TTY, nunca executa por segurança
  if (!process.stdin.isTTY) return false;

  const rl = readline.createInterface({ input, output });
  try {
    const ans = await rl.question(`${question} (s/N): `);
    return /^s$/i.test(ans.trim());
  } catch {
    return false;
  } finally {
    rl.close();
  }
}

// ==============================
// CLI args
// ==============================
ensureDataDir();

const args = process.argv.slice(2);

// Provider default
const provider = new OllamaProvider({
  baseUrl: "http://localhost:11434",
  model: "mistral",
});

// ==============================
// HELP
// ==============================
function printHelp() {
  console.log(`Agnetz.IA (CLI)

Uso:
  agnetz "sua pergunta"

Comandos:
  agnetz --help
  agnetz --reset
  agnetz --summary
  agnetz --validate-json <arquivo.json | '{"a":1}'>
  agnetz --read <arquivo>
  agnetz --write <arquivo> [conteúdo]         (ou via pipe: echo "x" | agnetz --write a.txt)

IA em arquivos:
  agnetz --summarize <arquivo>
  agnetz --extract-facts <arquivo>

Plano e execução segura:
  agnetz --plan "objetivo"
  agnetz --plan-show
  agnetz --execute

CSV:
  agnetz --csv-read <arquivo.csv> [--out destino.json]
  agnetz --csv-summary <arquivo.csv> [--out destino.(json|md)] [--format json|md]
  agnetz --csv-analyze <arquivo.csv> [--output destino.(txt|md|json)] [--format text|md|json]

Exemplos:
  agnetz --csv-analyze data/clientes.csv --format md --output data/relatorio.md
  agnetz --csv-analyze data/clientes.csv --format json --output data/relatorio.json
  agnetz --csv-summary data/clientes.csv
  agnetz --csv-summary data/clientes.csv --format md --out data/relatorio.md
`);
}

// ==============================
// --help
// ==============================
if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

// ==============================
// --reset
// ==============================
if (args.includes("--reset")) {
  ensureDataDir();
  writeJson(MEMORY_FILE, []);
  writeText(SUMMARY_FILE, "");
  console.log("Memória + resumo apagados ✅");
  process.exit(0);
}

// ==============================
// --summary (do summary file)
// ==============================
if (args.includes("--summary")) {
  const summary = readText(SUMMARY_FILE).trim();
  console.log(summary ? summary : "(sem resumo ainda)");
  process.exit(0);
}

// ==============================
// --validate-json
// ==============================
if (args.includes("--validate-json")) {
  const idx = args.indexOf("--validate-json");
  const target = (args[idx + 1] || "").trim();

  if (!target) {
    console.log('Uso: agnetz --validate-json <arquivo.json | \'{"a":1}\'>');
    process.exit(1);
  }

  try {
    let content = target;

    if (fs.existsSync(target)) {
      content = fs.readFileSync(target, "utf-8");
    }

    JSON.parse(content);
    console.log("JSON válido ✅");
    process.exit(0);
  } catch (err) {
    console.log("JSON inválido ❌");
    console.log("Motivo:", err?.message || err);
    process.exit(1);
  }
}

// ==============================
// --read
// ==============================
if (args.includes("--read")) {
  const idx = args.indexOf("--read");
  const filePath = args[idx + 1];
  if (!filePath) {
    console.log("Uso: agnetz --read <arquivo>");
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.log(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }
  console.log(fs.readFileSync(filePath, "utf-8"));
  process.exit(0);
}

// ==============================
// --write
// ==============================
if (args.includes("--write")) {
  const idx = args.indexOf("--write");
  const filePath = args[idx + 1];
  const inline = args.slice(idx + 2).join(" ");

  if (!filePath) {
    console.log("Uso: agnetz --write <arquivo> [conteúdo]");
    console.log('Ou:  echo "conteúdo" | agnetz --write <arquivo>');
    process.exit(1);
  }

  const piped = await readStdinAll();
  const content = piped && piped.trim().length > 0 ? piped : inline;

  if (!content || !content.trim()) {
    console.log("Nada para escrever (conteúdo vazio).");
    process.exit(1);
  }

  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(abs, content, "utf-8");
  console.log(`Arquivo salvo ✅: ${abs}`);
  process.exit(0);
}

// ==============================
// CSV: --csv-read
// ==============================
if (args.includes("--csv-read")) {
  const idx = args.indexOf("--csv-read");
  const filePath = args[idx + 1];

  if (!filePath) {
    console.log("Uso: agnetz --csv-read <arquivo.csv> [--out destino.json]");
    process.exit(1);
  }

  const outIdx = args.indexOf("--out");
  const outFile = outIdx >= 0 ? args[outIdx + 1] : null;

  try {
    const rows = readCsvAsJson(filePath);
    const json = JSON.stringify(rows, null, 2);

    if (outFile) {
      const abs = path.isAbsolute(outFile) ? outFile : path.join(ROOT, outFile);
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(abs, json, "utf-8");
      console.log(`✅ JSON salvo em: ${outFile}`);
    } else {
      console.log(json);
    }

    process.exit(0);
  } catch (err) {
    console.error("Erro no --csv-read ❌");
    console.error(err?.message || err);
    process.exit(1);
  }
}

// ==============================
// CSV: --csv-summary
// OPÇÃO B: --csv-summary --format md (Markdown técnico, sem IA)
// ==============================
if (args.includes("--csv-summary")) {
  const idx = args.indexOf("--csv-summary");
  const filePath = args[idx + 1];

  if (!filePath) {
    console.log("Uso: agnetz --csv-summary <arquivo.csv> [--out destino.(json|md)] [--format json|md]");
    process.exit(1);
  }

  const formatIdx = args.indexOf("--format");
  const format = formatIdx >= 0 ? (args[formatIdx + 1] || "json") : "json"; // json|md

  const outIdx = args.indexOf("--out");
  const outFile = outIdx >= 0 ? args[outIdx + 1] : null;

  try {
    const summary = summarizeCsv(filePath);

    let outputText = "";
    if (String(format).toLowerCase() === "md") {
      // Markdown técnico, sem IA
      outputText = csvSummaryToMarkdown(summary);
    } else {
      // JSON padrão (mantém comportamento validado)
      outputText = JSON.stringify(summary, null, 2);
    }

    if (outFile) {
      const abs = path.isAbsolute(outFile) ? outFile : path.join(ROOT, outFile);
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(abs, outputText, "utf-8");
      console.log(`✅ Resumo salvo em: ${outFile}`);
    } else {
      console.log(outputText);
    }

    process.exit(0);
  } catch (err) {
    console.error("Erro no --csv-summary ❌");
    console.error(err?.message || err);
    process.exit(1);
  }
}

// ==============================
// CSV: --csv-analyze (CSV + IA)
// OPÇÃO C: --csv-analyze --format json (JSON estruturado para automações)
// ==============================
if (args.includes("--csv-analyze")) {
  const idx = args.indexOf("--csv-analyze");
  const filePath = args[idx + 1];

  if (!filePath) {
    console.log("Uso: agnetz --csv-analyze <arquivo.csv> [--output destino] [--format text|md|json]");
    process.exit(1);
  }

  const formatIdx = args.indexOf("--format");
  const format = formatIdx >= 0 ? (args[formatIdx + 1] || "text") : "text"; // text|md|json

  const outIdx = args.indexOf("--output");
  const outFile = outIdx >= 0 ? args[outIdx + 1] : null;

  try {
    const summary = summarizeCsv(filePath);
    const sampleRows = summary.sample || [];

    // ====== OPÇÃO C (json): resposta estruturada ======
    if (String(format).toLowerCase() === "json") {
      const systemJson = `
Você é o Agnetz.IA.

RETORNE APENAS JSON VÁLIDO.
NÃO use markdown.
NÃO escreva texto fora do JSON.

Formato obrigatório:
{
  "resumo": "string curta",
  "insights": ["..."],
  "problemas": ["..."],
  "proximosPassos": ["..."],
  "perguntas": ["..."]
}

Regras:
- Tudo em pt-BR.
- Não invente dados (use apenas o resumo e a amostra).
- "perguntas" pode ser [] se não houver.
`.trim();

      const userJson = `
Gere a análise em JSON no formato obrigatório.

Arquivo: ${filePath}

RESUMO TÉCNICO (JSON):
${JSON.stringify(summary, null, 2)}

AMOSTRA (primeiras linhas, JSON):
${JSON.stringify(sampleRows, null, 2)}
`.trim();

      const jsonOnly = await provider.chat(
        [
          { role: "system", content: systemJson },
          { role: "user", content: userJson },
        ],
        { temperature: 0.2 }
      );

      let analysisObj;
      try {
        analysisObj = JSON.parse(String(jsonOnly).trim());
      } catch (e) {
        throw new Error("IA não retornou JSON válido no --csv-analyze --format json.");
      }

      const finalObj = {
        meta: {
          tool: "agnetz",
          command: "csv-analyze",
          format: "json",
        },
        file: filePath,
        summary,
        analysis: analysisObj,
      };

      const finalJson = JSON.stringify(finalObj, null, 2);

      if (outFile) {
        const abs = path.isAbsolute(outFile) ? outFile : path.join(ROOT, outFile);
        const dir = path.dirname(abs);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(abs, finalJson, "utf-8");
        console.log(`✅ Relatório salvo em: ${outFile}`);
        process.exit(0);
      }

      console.log(finalJson);
      process.exit(0);
    }

    // ====== comportamento atual (validado): text|md ======
    const systemPrompt = `
Você é o Agnetz.IA, um assistente técnico para desenvolvimento (Node.js, automações, APIs e IA local).

REGRAS OBRIGATÓRIAS:
- Responda sempre em pt-BR.
- Seja direto e prático.
- Não invente dados.
- Não explique JSON/curl/API a menos que o usuário peça explicitamente.
- Siga SEMPRE o formato abaixo.

FORMATO OBRIGATÓRIO DA SAÍDA (exatamente nesta ordem):

1) Resumo do arquivo:
2) Insights úteis: (lista com "-")
3) Possíveis problemas nos dados: (lista com "-")
4) Próximos passos recomendados: (lista com "-")
5) Perguntas que você precisa que eu responda (se necessário): (lista com "-")

`.trim();

    const userPrompt = `
Analise o CSV abaixo.

Arquivo: ${filePath}

RESUMO (JSON):
${JSON.stringify(summary, null, 2)}

AMOSTRA (primeiras linhas, JSON):
${JSON.stringify(sampleRows, null, 2)}

Agora gere a análise seguindo o formato obrigatório.
`.trim();

    const analysis = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2 }
    );

    let finalOutput = analysis;

    if (String(format).toLowerCase() === "md") {
      const mdHeader = csvSummaryToMarkdown(summary);
      finalOutput = `${mdHeader}\n\n## 🤖 Análise (IA)\n\n${analysis}\n`;
    }

    if (outFile) {
      const abs = path.isAbsolute(outFile) ? outFile : path.join(ROOT, outFile);
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(abs, finalOutput, "utf-8");
      console.log(`✅ Relatório salvo em: ${outFile}`);
      process.exit(0);
    }

    console.log(finalOutput);
    process.exit(0);
  } catch (err) {
    console.error("Erro no --csv-analyze ❌");
    console.error(err?.message || err);
    process.exit(1);
  }
}

// ==============================
// --summarize (IA em arquivo)
// ==============================
if (args.includes("--summarize")) {
  const idx = args.indexOf("--summarize");
  const filePath = args[idx + 1];

  if (!filePath) {
    console.log("Uso: agnetz --summarize <arquivo>");
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.log(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");

  const systemPrompt = `
Você é o Agnetz.IA, um assistente técnico.

REGRAS:
- Responda sempre em pt-BR.
- Seja direto.
- Se houver comandos, liste em um bloco separado.
- Não invente informações.
`.trim();

  const userPrompt = `
Resuma o conteúdo abaixo de forma objetiva.

CONTEÚDO:
${content}
`.trim();

  try {
    const answer = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2 }
    );

    console.log(answer);
    process.exit(0);
  } catch (err) {
    console.error("ERRO:", err?.message || err);
    process.exit(1);
  }
}

// ==============================
// --extract-facts (IA + salvar resumo curto)
// ==============================
if (args.includes("--extract-facts")) {
  const idx = args.indexOf("--extract-facts");
  const filePath = args[idx + 1];

  if (!filePath) {
    console.log("Uso: agnetz --extract-facts <arquivo>");
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.log(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");

  const systemPrompt = `
Você é o Agnetz.IA e vai extrair FATOS em formato determinístico.

REGRAS:
- Responda SEMPRE com uma lista de linhas no formato: "- tipo: chave = valor"
- Sem texto fora da lista.
- Sem explicações.
- Máximo de 12 linhas.
- Tudo em pt-BR.
`.trim();

  const userPrompt = `
Extraia fatos do conteúdo abaixo.

CONTEÚDO:
${content}
`.trim();

  try {
    const facts = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1 }
    );

    // salva no summary file (substitui)
    writeText(SUMMARY_FILE, facts.trim());

    console.log("Fatos extraídos e salvos ✅");
    console.log(facts.trim());
    process.exit(0);
  } catch (err) {
    console.error("ERRO:", err?.message || err);
    process.exit(1);
  }
}

// ==============================
// Plan: --plan / --plan-show / --execute
// ==============================
if (args.includes("--plan")) {
  const idx = args.indexOf("--plan");
  const goal = args.slice(idx + 1).join(" ").trim();

  if (!goal) {
    console.log('Uso: agnetz --plan "objetivo"');
    process.exit(1);
  }

  const summary = readText(SUMMARY_FILE).trim();

  const systemPrompt = `
Você é o Agnetz.IA e vai gerar um plano EXECUTÁVEL com segurança.

REGRAS:
- Responda em JSON válido.
- Não inclua markdown.
- Não invente dependências.
- Preferir comandos simples e seguros.
- Cada passo deve ter:
  - title (string)
  - details (string)
  - commands (array de strings, pode ser vazio)
  - risk (string curto)
- JSON final deve ter:
  { "title": "...", "objective": "...", "premises": [...], "steps": [...] }
`.trim();

  const userPrompt = `
Objetivo:
${goal}

Resumo atual (se existir):
${summary ? summary : "(vazio)"}
`.trim();

  try {
    const planJson = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2 }
    );

    // valida JSON e salva
    const parsed = JSON.parse(planJson);
    writeJson(PLAN_FILE, parsed);

    console.log("\n🧠 PLANO GERADO (sem executar nada)\n");
    console.log(`Título: ${parsed.title}`);
    console.log(`Objetivo: ${parsed.objective}`);
    console.log("\nPremissas:");
    (parsed.premises || []).forEach((p) => console.log(`- ${p}`));

    console.log("\nPassos:\n");
    (parsed.steps || []).forEach((s, i) => {
      console.log(`${i + 1}. ${s.title}`);
      console.log(`   Detalhes: ${s.details}`);
      if (Array.isArray(s.commands) && s.commands.length) {
        console.log("   Comandos:");
        s.commands.forEach((c) => console.log(`   - ${c}`));
      }
      console.log(`   Risco: ${s.risk}`);
      console.log("");
    });

    console.log(`Plano salvo em: ${PLAN_FILE}`);
    process.exit(0);
  } catch (err) {
    console.error("Erro ao gerar plano ❌");
    console.error(err?.message || err);
    process.exit(1);
  }
}

if (args.includes("--plan-show")) {
  const plan = readJson(PLAN_FILE, null);
  if (!plan) {
    console.log('Nenhum plano salvo ainda. Use: agnetz --plan "objetivo"');
    process.exit(1);
  }

  console.log("\n🧠 PLANO GERADO (sem executar nada)\n");
  console.log(`Título: ${plan.title}`);
  console.log(`Objetivo: ${plan.objective}`);
  console.log("\nPremissas:");
  (plan.premises || []).forEach((p) => console.log(`- ${p}`));

  console.log("\nPassos:\n");
  (plan.steps || []).forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
    console.log(`   Detalhes: ${s.details}`);
    if (Array.isArray(s.commands) && s.commands.length) {
      console.log("   Comandos:");
      s.commands.forEach((execCmd) => console.log(`   - ${execCmd}`));
    }
    console.log(`   Risco: ${s.risk}`);
    console.log("");
  });

  console.log(`Plano salvo em: ${PLAN_FILE}`);
  process.exit(0);
}

if (args.includes("--execute")) {
  const plan = readJson(PLAN_FILE, null);
  if (!plan || !Array.isArray(plan.steps)) {
    console.log('Nenhum plano válido para executar. Use: agnetz --plan "objetivo"');
    process.exit(1);
  }

  console.log("\n🚀 EXECUÇÃO SEGURA DO PLANO");
  console.log("Nada será executado sem sua confirmação.\n");

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const commands = Array.isArray(step.commands) ? step.commands : [];

    console.log(`\n== Passo ${i + 1}: ${step.title} ==\n`);
    if (commands.length === 0) {
      console.log("(Sem comandos neste passo)");
      continue;
    }

    for (const cmd of commands) {
      console.log(`Comando: ${cmd}`);
      const ok = await askYesNo("Executar?");
      if (!ok) {
        console.log("⏭️  Pulado.");
        continue;
      }

      try {
        console.log("▶️  Executando...\n");
        const res = await execa(cmd, { shell: true, stdio: "inherit" });
        if (res?.exitCode === 0) console.log("\n✅ OK");
      } catch (err) {
        console.log("\n❌ Erro ao executar comando.");
        console.log(err?.message || err);
      }
    }
  }

  console.log("\n✅ Execução finalizada.");
  process.exit(0);
}

// ==============================
// CHAT normal (fallback)
// ==============================
const question = args.join(" ").trim();

if (!question) {
  printHelp();
  process.exit(0);
}

// Carrega memória curta e resumo
const history = readJson(MEMORY_FILE, []);
const summary = readText(SUMMARY_FILE).trim();

// injeta agente com prompt + memória curta
const agnetz = new AgnetzIA({
  provider,
  systemPrompt: `
Você é o Agnetz.IA, um assistente técnico para desenvolvimento (Node.js, automações, APIs e IA local).

REGRAS OBRIGATÓRIAS:
- Responda sempre em pt-BR.
- Seja direto e prático.
- NÃO explique JSON/curl/APIs/formatos técnicos, a menos que o usuário peça explicitamente.
- Se o usuário pedir "comando curl", devolva comando completo e correto.
- Use sempre URL real do Ollama local: http://localhost:11434
- Nunca invente domínio.

RESUMO (fatos do usuário / projeto, se existir):
${summary ? summary : "(sem resumo ainda)"}
`.trim(),
});

// injeta histórico curto
agnetz.history = lastMessages(history, MAX_TURNS_TO_KEEP);

// perguntar
let answer = "";
try {
  answer = await agnetz.ask(question);
  console.log(answer);
} catch (err) {
  console.error("Erro ao executar o Agnetz:", err?.message || err);
  process.exit(1);
}

// salva histórico curto atualizado
const updatedHistory = lastMessages(agnetz.history, MAX_TURNS_TO_KEEP);
writeJson(MEMORY_FILE, updatedHistory);

// extração determinística simples (sem IA) para alimentar SUMMARY_FILE
let summaryLines = normalizeLines(summary);

// nome
const nameMatch = question.match(/meu nome é\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,3})/i);
if (nameMatch) {
  const name = nameMatch[1].trim();
  summaryLines = upsertBullet(summaryLines, "- Nome do usuário: ", name);
}

// objetivo
const goalMatch = question.match(/(quero|estou|tô|preciso)\s+(criar|fazer|montar|desenvolver)\s+(.{10,140})/i);
if (goalMatch) {
  const goal = goalMatch[3].trim().replace(/\s+/g, " ");
  summaryLines = upsertBullet(summaryLines, "- Objetivo atual: ", goal);
}

// projeto
if (/(agnetz\.?ia|agnetz)/i.test(question)) {
  summaryLines = upsertBullet(summaryLines, "- Projeto: ", "Agnetz.IA (CLI local com Ollama)");
}

if (summaryLines.length) {
  writeText(SUMMARY_FILE, summaryLines.slice(0, 10).join("\n"));
}
