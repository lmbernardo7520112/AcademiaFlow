import type { ILLMProvider } from './providers/ILLMProvider.js';
import { PromptBuilder } from './prompt-builder.js';
import { AlunoModel } from '../../models/Aluno.js';
import { NotaModel } from '../../models/Nota.js';
import { atividadeGeradaSchema } from '@academiaflow/shared';
import type { AnalyzeStudentPayload, AtividadeGerada } from '@academiaflow/shared';

export class AIEngineService {
  constructor(private provider: ILLMProvider) {}

  async generateActivity(tenantId: string, payload: AnalyzeStudentPayload): Promise<AtividadeGerada> {
    const aluno = await AlunoModel.findOne({ _id: payload.alunoId, tenantId, isActive: true });
    
    if (!aluno) {
      throw new Error('Aluno não encontrado neste ambiente ou inativo.');
    }

    // Busca o histórico mais recente do aluno (limitado a 10 notas)
    const notasBD = await NotaModel.find({ tenantId, alunoId: payload.alunoId })
      .populate('disciplinaId', 'name')
      .sort({ year: -1, bimester: -1 })
      .limit(10);

    const historicoNotas = notasBD.map((nota: any) => ({
      disciplina: nota.disciplinaId?.name || 'Desconhecida',
      bimester: nota.bimester,
      value: nota.value,
    }));

    // Injeta as informações no Orquestrador Prompter
    const systemPrompt = PromptBuilder.buildPedagogicalPrompt(
      aluno.name,
      payload.focoAtividade,
      historicoNotas
    );

    // Bate na Barreira do Provider (pode ser o Mock ou o Gemini Real)
    // O retorno será forçado e validado via Zod
    const activity = await this.provider.generateStructuredData<AtividadeGerada>(
      systemPrompt, 
      atividadeGeradaSchema
    );

    return activity;
  }
}
