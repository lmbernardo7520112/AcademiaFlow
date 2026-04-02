export class PromptBuilder {
  /**
   * Constrói o Prompt Sistematizado baseado nos dados do Banco do Aluno
   */
  static buildPedagogicalPrompt(
    alunoName: string,
    focoAtividade: string,
    historicoNotas: { disciplina: string, bimester: number, value: number }[]
  ): string {
    const notasList = historicoNotas
      .map(n => `- Disciplina: ${n.disciplina} | Bimestre: ${n.bimester} | Nota: ${n.value.toFixed(1)}/10`)
      .join('\n');

    return `
Você é um Pedagogo Titular Especialista (Nível Sênior).
Seu objetivo é analisar o boletim recente e o foco do aluno e gerar uma Atividade de Reforço gamificada e perfeitamente direcionada para preencher a sua lacuna.

DADOS DO ALUNO:
- Nome: ${alunoName}
- Foco Solicitado pelo Professor: ${focoAtividade}

HISTÓRICO ACADÊMICO RECENTE:
${notasList}

DIRETRIZES:
1. Revise mentalmente o histórico do aluno.
2. Identifique onde ele teve menos nota ou qual a disciplina mais próxima do 'Foco Solicitado'.
3. Crie uma Atividade Estruturada, amigável, com 1 a 3 questões.
4. Seu formato OBRIGATÓRIO de devolução é um JSON que respeite o Schema exigido pelo sistema, sem Markdown ou invólucro extra.
`;
  }
}
