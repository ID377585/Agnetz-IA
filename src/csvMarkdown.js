export function csvSummaryToMarkdown(summary) {
  const {
    file,
    lines,
    dataRows,
    columns,
    headers,
    numericColumns,
    numericSummary,
    sample
  } = summary;

  let md = `# 📊 Relatório CSV\n\n`;

  md += `**Arquivo:** \`${file}\`\n\n`;
  md += `- Linhas totais: **${lines}**\n`;
  md += `- Linhas de dados: **${dataRows}**\n`;
  md += `- Colunas: **${columns}**\n\n`;

  md += `## 🧾 Cabeçalhos\n`;
  headers.forEach(h => {
    md += `- ${h}\n`;
  });
  md += `\n`;

  if (numericColumns.length > 0) {
    md += `## 🔢 Colunas Numéricas\n\n`;

    for (const col of numericColumns) {
      const { count, sum, avg } = numericSummary[col];
      md += `### ${col}\n`;
      md += `- Quantidade: **${count}**\n`;
      md += `- Soma: **${sum}**\n`;
      md += `- Média: **${avg}**\n\n`;
    }
  }

  md += `## 🔍 Amostra dos dados\n\n`;
  md += `| ${headers.join(" | ")} |\n`;
  md += `| ${headers.map(() => "---").join(" | ")} |\n`;

  for (const row of sample) {
    md += `| ${headers.map(h => row[h]).join(" | ")} |\n`;
  }

  md += `\n---\n`;
  md += `_Relatório gerado automaticamente pelo Agnetz 🤖_`;

  return md;
}

