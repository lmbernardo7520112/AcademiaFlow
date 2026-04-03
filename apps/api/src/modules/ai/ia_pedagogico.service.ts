import { GeminiProvider } from './providers/GeminiProvider.js';
import { NotaModel } from '../../models/Nota.js';
import { ValidacaoPedagogicaModel } from '../../models/ValidacaoPedagogica.js';
import { DisciplinaModel } from '../../models/Disciplina.js';

export class IaPedagogicoService {
  private _aiProvider: import('./providers/ILLMProvider.js').ILLMProvider | null = null;

  public setProvider(provider: import('./providers/ILLMProvider.js').ILLMProvider) {
    this._aiProvider = provider;
  }

  private get aiProvider(): import('./providers/ILLMProvider.js').ILLMProvider {
    if (!this._aiProvider) {
      this._aiProvider = new GeminiProvider();
    }
    return this._aiProvider;
  }

  constructor() {}

  async generatePerformanceAnalysis(tenantId: string, bimester: number, year: number, disciplinaId: string) {
    // 1. Get Discipline and Student Data
    const disciplina = await DisciplinaModel.findById(disciplinaId).populate('turmaId');
    if (!disciplina) throw new Error('Disciplina não encontrada');

    const notas = await NotaModel.find({ tenantId, disciplinaId, bimester, year }).populate('alunoId');
    
    // 2. Prepare Context for IA
    const studentGrades = (notas as unknown as Array<{ alunoId?: { name: string }, value: number }>).map(n => ({
      name: n.alunoId?.name || 'Estudante',
      value: n.value
    }));

    const prompt = `
      Você é um consultor pedagógico de IA de elite para a plataforma AcademiaFlow.
      Analise o desempenho da turma na disciplina "${disciplina.name}" no ${bimester}º bimestre de ${year}.
      
      Notas dos Alunos:
      ${JSON.stringify(studentGrades)}

      REQUISITOS DA RESPOSTA:
      1. Forneça um panorama geral da turma.
      2. Identifique os alunos em situação crítica (baixo desempenho).
      3. Sugira estratégias pedagógicas específicas para o professor melhorar o engajamento.
      4. Retorne o texto formatado em Markdown elegante.
    `;

    const analysisText = await this.aiProvider.generateText(prompt);

    // 3. Persist and return
    const record = await ValidacaoPedagogicaModel.create({
      tenantId,
      professorId: disciplina.professorId,
      turmaId: disciplina.turmaId?._id || disciplina.turmaId,
      disciplinaId,
      bimester,
      year,
      type: 'ANALYSIS',
      content: analysisText
    });

    return record;
  }

  async generateRecoveryExercises(tenantId: string, bimester: number, year: number, disciplinaId: string) {
    // 1. Identify Students in Need (Grade < 6.0)
    const criticalGrades = await NotaModel.find({ 
      tenantId, 
      disciplinaId, 
      bimester, 
      year, 
      value: { $lt: 6.0 } 
    }).populate('alunoId');

    if (criticalGrades.length === 0) {
      return { message: 'Parabéns! Nenhum aluno com média crítica para recuperação neste bimestre.' };
    }

    const studentsNames = (criticalGrades as unknown as Array<{ alunoId?: { name: string } }>).map(n => n.alunoId?.name || 'Estudante').join(', ');
    const disciplina = await DisciplinaModel.findById(disciplinaId);
    if (!disciplina) throw new Error('Disciplina não encontrada');

    const prompt = `
      Gere uma lista de 5 exercícios de recuperação para a disciplina "${disciplina.name}".
      Público Alvo: Alunos com dificuldade de aprendizado (${studentsNames}).
      
      REQUISITOS:
      - Cada exercício deve ter um enunciado claro.
      - 4 alternativas (A, B, C, D).
      - Indique a alternativa correta.
      - Forneça uma explicação pedagógica curta de por que essa é a resposta.
      - Retorne os dados em formato JSON estrito seguindo este formato de array:
        [{"question": "string", "options": ["string"], "correctAnswer": "string", "explanation": "string"}]
    `;

    const rawResponse = await this.aiProvider.generateText(prompt);
    
    // Extract JSON with safety checks
    let jsonStr = rawResponse;
    if (rawResponse.includes('```json')) {
      const parts = rawResponse.split('```json');
      if (parts[1]) {
        jsonStr = parts[1].split('```')[0] || '';
      }
    }
    
    let exercises = [];
    try {
      exercises = JSON.parse(jsonStr);
    } catch {
      throw new Error('A IA não retornou um formato de exercícios válido. Tente novamente.');
    }

    // 2. Persist
    const record = await ValidacaoPedagogicaModel.create({
      tenantId,
      professorId: disciplina.professorId,
      turmaId: (disciplina.turmaId as unknown as { _id?: string })._id || disciplina.turmaId,
      disciplinaId,
      bimester,
      year,
      type: 'EXERCISES',
      exercises,
      targetStudents: criticalGrades.map(n => n.alunoId)
    });

    return record;
  }
}

export const iaPedagogicoService = new IaPedagogicoService();
