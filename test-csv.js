import { readCsvAsJson, summarizeCsv } from "./src/csvSimple.js";

console.log("=== CSV → JSON ===");
const data = readCsvAsJson("data/clientes.csv");
console.log(data);

console.log("\n=== RESUMO ===");
const summary = summarizeCsv("data/clientes.csv");
console.log(summary);
