import { TurmaModel } from '../../models/Turma.js';
import type { CreateTurmaPayload, UpdateTurmaPayload } from '@academiaflow/shared';

export class TurmasService {
  async create(data: CreateTurmaPayload) {
    const activeExists = await TurmaModel.findOne({ name: data.name, year: data.year, isActive: true });
    if (activeExists) {
      throw new Error('Já existe uma turma ativa com este nome e ano.');
    }
    const turma = await TurmaModel.create(data);
    return turma;
  }

  async list() {
    return TurmaModel.find({ isActive: true }).sort({ year: -1, name: 1 });
  }

  async getById(id: string) {
    const turma = await TurmaModel.findOne({ _id: id, isActive: true });
    if (!turma) throw new Error('Turma não encontrada ou inativa');
    return turma;
  }

  async update(id: string, data: UpdateTurmaPayload) {
    const turma = await TurmaModel.findOneAndUpdate(
      { _id: id, isActive: true },
      data,
      { new: true }
    );
    if (!turma) throw new Error('Turma não encontrada para atualização');
    return turma;
  }

  async softDelete(id: string) {
    const turma = await TurmaModel.findOneAndUpdate(
      { _id: id, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!turma) throw new Error('Turma não encontrada para deleção');
    return { success: true, message: 'Turma deletada com sucesso' };
  }
}

export const turmasService = new TurmasService();
