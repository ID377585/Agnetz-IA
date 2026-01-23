import fs from "node:fs";

function splitLines(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
}

function parseCsvSimple(text) {
  const lines = splitLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] ?? `col${c + 1}`;
      obj[key] = (cols[c] ?? "").trim();
    }
    rows.push(obj);
  }

  return { headers, rows };
}

export function readCsvAsJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const { rows } = parseCsvSimple(text);
  return rows;
}

export function summarizeCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const { headers, rows } = parseCsvSimple(text);

  const numeric = {};
  for (const h of headers) numeric[h] = { count: 0, sum: 0 };

  for (const row of rows) {
    for (const h of headers) {
      const v = row[h];
      const n = Number(String(v).replace(",", "."));
      if (Number.isFinite(n)) {
        numeric[h].count += 1;
        numeric[h].sum += n;
      }
    }
  }

  const numericSummary = {};
  for (const h of headers) {
    const { count, sum } = numeric[h];
    if (count > 0) {
      numericSummary[h] = {
        count,
        sum,
        avg: sum / count,
      };
    }
  }

  return {
    file: filePath,
    lines: rows.length + (headers.length ? 1 : 0),
    dataRows: rows.length,
    columns: headers.length,
    headers,
    numericColumns: Object.keys(numericSummary),
    numericSummary,
    sample: rows.slice(0, 3),
  };
}

