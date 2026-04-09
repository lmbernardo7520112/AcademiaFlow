import { TurmaModel } from '../../models/Turma.js';
import type { CreateTurmaPayload, UpdateTurmaPayload } from '@academiaflow/shared';

export class TurmasService {
  async create(tenantId: string, data: CreateTurmaPayload) {
    const activeExists = await TurmaModel.findOne({ tenantId, name: data.name, year: data.year, isActive: true });
    if (activeExists) {
      throw new Error('Já existe uma turma ativa com este nome e ano.');
    }
    const turma = await TurmaModel.create({ ...data, tenantId });
    return turma;
  }

  async list(tenantId: string) {
    return TurmaModel.find({ tenantId, isActive: true }).sort({ year: -1, name: 1 });
  }

  async getById(tenantId: string, id: string) {
    const turma = await TurmaModel.findOne({ _id: id, tenantId, isActive: true });
    if (!turma) throw new Error('Turma não encontrada ou inativa');
    return turma;
  }

  async update(tenantId: string, id: string, data: UpdateTurmaPayload) {
    const turma = await TurmaModel.findOneAndUpdate(
      { _id: id, tenantId, isActive: true },
      data,
      { new: true }
    );
    if (!turma) throw new Error('Turma não encontrada para atualização');
    return turma;
  }

  async softDelete(tenantId: string, id: string) {
    const turma = await TurmaModel.findOneAndUpdate(
      { _id: id, tenantId, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!turma) throw new Error('Turma não encontrada para deleção');
    return { success: true, message: 'Turma deletada com sucesso' };
  }
}

export const turmasService = new TurmasService();
