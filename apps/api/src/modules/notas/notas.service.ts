import { NotaModel } from '../../models/Nota.js';
import { AlunoModel } from '../../models/Aluno.js';
import { DisciplinaModel } from '../../models/Disciplina.js';
import { TurmaModel } from '../../models/Turma.js';
import type { CreateNotaPayload, UpdateNotaPayload, CreateBulkNotasPayload } from '@academiaflow/shared';

interface NotasFilter {
  alunoId?: string;
  disciplinaId?: string;
  turmaId?: string;
  year?: number;
  bimester?: number;
}

export class NotasService {

  private async validateEntities(data: CreateNotaPayload | UpdateNotaPayload) {
    if (data.alunoId) {
      const aluno = await AlunoModel.findOne({ _id: data.alunoId, isActive: true });
      if (!aluno) throw new Error(`Aluno ${data.alunoId} não encontrado ou inativo`);
    }
    if (data.disciplinaId) {
      const disciplina = await DisciplinaModel.findOne({ _id: data.disciplinaId, isActive: true });
      if (!disciplina) throw new Error(`Disciplina ${data.disciplinaId} não encontrada ou inativa`);
    }
    if (data.turmaId) {
      const turma = await TurmaModel.findOne({ _id: data.turmaId, isActive: true });
      if (!turma) throw new Error(`Turma ${data.turmaId} não encontrada ou inativa`);
    }
  }

  async create(data: CreateNotaPayload) {
    await this.validateEntities(data);

    // Check if the student already has a grade for this discipline and bimester in the same year
    const existing = await NotaModel.findOne({
      alunoId: data.alunoId,
      disciplinaId: data.disciplinaId,
      year: data.year,
      bimester: data.bimester,
    });
    
    if (existing) {
      throw new Error('Nota já cadastrada para este aluno, disciplina e bimestre no ano corrente');
    }

    const nota = await NotaModel.create(data);
    return nota;
  }

  async bulkCreate(dataList: CreateBulkNotasPayload) {
    const results = [];
    const errors = [];

    let index = 0;
    for (const item of dataList) {
      try {
        const result = await this.create(item);
        results.push(result);
      } catch (err) {
        errors.push({
          index,
          item,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
      index++;
    }

    return {
      successCount: results.length,
      errorCount: errors.length,
      inserted: results,
      errors,
    };
  }

  async list(filters: NotasFilter) {
    return NotaModel.find(filters)
      .populate('alunoId', 'name matricula')
      .populate('disciplinaId', 'name')
      .populate('turmaId', 'name year')
      .sort({ year: -1, bimester: -1 });
  }

  async getById(id: string) {
    const nota = await NotaModel.findById(id)
      .populate('alunoId', 'name matricula')
      .populate('disciplinaId', 'name')
      .populate('turmaId', 'name year');
    if (!nota) throw new Error('Nota não encontrada');
    return nota;
  }

  async update(id: string, data: UpdateNotaPayload) {
    await this.validateEntities(data);

    const nota = await NotaModel.findById(id);
    if (!nota) throw new Error('Nota não encontrada para atualização');

    // Check duplicate if updating bimester/year etc
    if (data.bimester || data.year || data.alunoId || data.disciplinaId) {
       const duplicate = await NotaModel.findOne({
         _id: { $ne: id },
         alunoId: data.alunoId || nota.alunoId,
         disciplinaId: data.disciplinaId || nota.disciplinaId,
         year: data.year || nota.year,
         bimester: data.bimester || nota.bimester,
       });

       if (duplicate) {
         throw new Error('Atualização causaria duplicidade (já existe nota para este aluno/disciplina/bimestre)');
       }
    }

    const updated = await NotaModel.findByIdAndUpdate(id, data, { new: true });
    return updated;
  }

  async delete(id: string) {
    const result = await NotaModel.findByIdAndDelete(id);
    if (!result) throw new Error('Nota não encontrada para deleção');
    return { success: true, message: 'Nota removida com sucesso' };
  }
}

export const notasService = new NotasService();
