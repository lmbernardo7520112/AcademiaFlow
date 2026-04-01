import { AlunoModel } from '../../models/Aluno.js';
import { TurmaModel } from '../../models/Turma.js';
import type { CreateAlunoPayload, UpdateAlunoPayload } from '@academiaflow/shared';

export class AlunosService {
  async create(data: CreateAlunoPayload) {
    const activeTurma = await TurmaModel.findOne({ _id: data.turmaId, isActive: true });
    if (!activeTurma) {
      throw new Error('Turma informada não foi encontrada ou está inativa');
    }

    const matriculaExists = await AlunoModel.findOne({ matricula: data.matricula, isActive: true });
    if (matriculaExists) {
      throw new Error('Já existe um aluno ativo com esta matrícula');
    }

    const aluno = await AlunoModel.create(data);
    return aluno;
  }

  async list(query?: { turmaId?: string }) {
    const filter: Record<string, unknown> = { isActive: true };
    if (query?.turmaId) {
      filter.turmaId = query.turmaId;
    }
    return AlunoModel.find(filter).populate('turmaId', 'name year').sort({ name: 1 });
  }

  async getById(id: string) {
    const aluno = await AlunoModel.findOne({ _id: id, isActive: true }).populate('turmaId', 'name year');
    if (!aluno) throw new Error('Aluno não encontrado ou inativo');
    return aluno;
  }

  async update(id: string, data: UpdateAlunoPayload) {
    if (data.turmaId) {
      const activeTurma = await TurmaModel.findOne({ _id: data.turmaId, isActive: true });
      if (!activeTurma) throw new Error('Nova turma informada não existe ou está inativa');
    }

    if (data.matricula) {
      const duplicate = await AlunoModel.findOne({ 
        matricula: data.matricula, 
        _id: { $ne: id },
        isActive: true 
      });
      if (duplicate) throw new Error('Matrícula já está em uso por outro aluno ativo');
    }

    const aluno = await AlunoModel.findOneAndUpdate(
      { _id: id, isActive: true },
      data,
      { new: true }
    );
    if (!aluno) throw new Error('Aluno não encontrado para atualização');
    return aluno;
  }

  async softDelete(id: string) {
    const aluno = await AlunoModel.findOneAndUpdate(
      { _id: id, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!aluno) throw new Error('Aluno não encontrado para deleção');
    return { success: true, message: 'Aluno inativado com sucesso' };
  }
}

export const alunosService = new AlunosService();
