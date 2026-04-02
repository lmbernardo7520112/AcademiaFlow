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

  private async validateEntities(tenantId: string, data: CreateNotaPayload | UpdateNotaPayload) {
    if (data.alunoId) {
      const aluno = await AlunoModel.findOne({ _id: data.alunoId, tenantId, isActive: true });
      if (!aluno) throw new Error(`Aluno ${data.alunoId} não encontrado ou inativo neste ambiente`);
    }
    if (data.disciplinaId) {
      const disciplina = await DisciplinaModel.findOne({ _id: data.disciplinaId, tenantId, isActive: true });
      if (!disciplina) throw new Error(`Disciplina ${data.disciplinaId} não encontrada ou inativa neste ambiente`);
    }
    if (data.turmaId) {
      const turma = await TurmaModel.findOne({ _id: data.turmaId, tenantId, isActive: true });
      if (!turma) throw new Error(`Turma ${data.turmaId} não encontrada ou inativa neste ambiente`);
    }
  }

  async create(tenantId: string, data: CreateNotaPayload) {
    await this.validateEntities(tenantId, data);

    // Check if the student already has a grade for this discipline and bimester in the same year
    const existing = await NotaModel.findOne({
      tenantId,
      alunoId: data.alunoId,
      disciplinaId: data.disciplinaId,
      year: data.year,
      bimester: data.bimester,
    });
    
    if (existing) {
      throw new Error('Nota já cadastrada para este aluno, disciplina e bimestre no ano corrente');
    }

    const nota = await NotaModel.create({ ...data, tenantId });
    return nota;
  }

  async bulkCreate(tenantId: string, dataList: CreateBulkNotasPayload) {
    const results = [];
    const errors = [];

    let index = 0;
    for (const item of dataList) {
      try {
        const result = await this.create(tenantId, item);
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

  async list(tenantId: string, filters: NotasFilter) {
    const mergedFilters = { ...filters, tenantId };
    return NotaModel.find(mergedFilters)
      .populate('alunoId', 'name matricula')
      .populate('disciplinaId', 'name')
      .populate('turmaId', 'name year')
      .sort({ year: -1, bimester: -1 });
  }

  async getById(tenantId: string, id: string) {
    const nota = await NotaModel.findOne({ _id: id, tenantId })
      .populate('alunoId', 'name matricula')
      .populate('disciplinaId', 'name')
      .populate('turmaId', 'name year');
    if (!nota) throw new Error('Nota não encontrada no ambiente');
    return nota;
  }

  async update(tenantId: string, id: string, data: UpdateNotaPayload) {
    await this.validateEntities(tenantId, data);

    const nota = await NotaModel.findOne({ _id: id, tenantId });
    if (!nota) throw new Error('Nota não encontrada para atualização');

    // Check duplicate if updating bimester/year etc
    if (data.bimester || data.year || data.alunoId || data.disciplinaId) {
       const duplicate = await NotaModel.findOne({
         tenantId,
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

    const updated = await NotaModel.findOneAndUpdate({ _id: id, tenantId }, data, { new: true });
    return updated;
  }

  async delete(tenantId: string, id: string) {
    const result = await NotaModel.findOneAndDelete({ _id: id, tenantId });
    if (!result) throw new Error('Nota não encontrada para deleção');
    return { success: true, message: 'Nota removida com sucesso' };
  }
}

export const notasService = new NotasService();
