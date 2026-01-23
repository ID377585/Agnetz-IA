# Ideias para o Agnetz.IA

O Agnetz.IA é um agente local em Node.js que usa o Ollama para responder perguntas.
Ele possui memória curta (histórico) e memória inteligente (resumo de fatos).
O objetivo é permitir que o agente execute tarefas reais, como:

- Ler e resumir arquivos
- Validar JSON
- Criar arquivos
- Ajudar com automações

## Próximos passos
1. Adicionar suporte a CSV com parsing
2. Adicionar suporte a PDF via parser
3. Criar modo "plan + execute" (planejar e executar)

## Observações
Não queremos que o modelo invente comandos.
O modelo só deve explicar JSON e curl se o usuário pedir.
