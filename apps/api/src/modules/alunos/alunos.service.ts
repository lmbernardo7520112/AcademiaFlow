import { AlunoModel } from '../../models/Aluno.js';
import { TurmaModel } from '../../models/Turma.js';
import type { CreateAlunoPayload, UpdateAlunoPayload } from '@academiaflow/shared';

export class AlunosService {
  async create(tenantId: string, data: CreateAlunoPayload) {
    const activeTurma = await TurmaModel.findOne({ _id: data.turmaId, tenantId, isActive: true });
    if (!activeTurma) {
      throw new Error('Turma informada não foi encontrada ou está inativa neste ambiente');
    }

    const matriculaExists = await AlunoModel.findOne({ tenantId, matricula: data.matricula, isActive: true });
    if (matriculaExists) {
      throw new Error('Já existe um aluno ativo com esta matrícula');
    }

    const aluno = await AlunoModel.create({ ...data, tenantId });
    return aluno;
  }

  async list(tenantId: string, query?: { turmaId?: string }) {
    const filter: Record<string, unknown> = { tenantId, isActive: true };
    if (query?.turmaId) {
      filter.turmaId = query.turmaId;
    }
    return AlunoModel.find(filter).populate('turmaId', 'name year').sort({ name: 1 });
  }

  async getById(tenantId: string, id: string) {
    const aluno = await AlunoModel.findOne({ _id: id, tenantId, isActive: true }).populate('turmaId', 'name year');
    if (!aluno) throw new Error('Aluno não encontrado ou inativo');
    return aluno;
  }

  async update(tenantId: string, id: string, data: UpdateAlunoPayload) {
    if (data.turmaId) {
      const activeTurma = await TurmaModel.findOne({ _id: data.turmaId, tenantId, isActive: true });
      if (!activeTurma) throw new Error('Nova turma informada não existe ou está inativa neste ambiente');
    }

    if (data.matricula) {
      const duplicate = await AlunoModel.findOne({ 
        tenantId,
        matricula: data.matricula, 
        _id: { $ne: id },
        isActive: true 
      });
      if (duplicate) throw new Error('Matrícula já está em uso por outro aluno ativo');
    }

    const aluno = await AlunoModel.findOneAndUpdate(
      { _id: id, tenantId, isActive: true },
      data,
      { new: true }
    );
    if (!aluno) throw new Error('Aluno não encontrado para atualização');
    return aluno;
  }

  async softDelete(tenantId: string, id: string) {
    const aluno = await AlunoModel.findOneAndUpdate(
      { _id: id, tenantId, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!aluno) throw new Error('Aluno não encontrado para deleção');
    return { success: true, message: 'Aluno inativado com sucesso' };
  }
}

export const alunosService = new AlunosService();
