import { DisciplinaModel } from '../../models/Disciplina.js';
import type { CreateDisciplinaPayload, UpdateDisciplinaPayload } from '@academiaflow/shared';

export class DisciplinasService {
  async create(tenantId: string, data: CreateDisciplinaPayload) {
    const existing = await DisciplinaModel.findOne({ tenantId, name: data.name, isActive: true });
    if (existing) {
      throw new Error('Já existe uma disciplina ativa com este nome neste ambiente');
    }

    const disciplina = await DisciplinaModel.create({ ...data, tenantId });
    return disciplina;
  }

  async list(tenantId: string) {
    return DisciplinaModel.find({ tenantId, isActive: true }).sort({ name: 1 });
  }

  async getById(tenantId: string, id: string) {
    const disciplina = await DisciplinaModel.findOne({ _id: id, tenantId, isActive: true });
    if (!disciplina) throw new Error('Disciplina não encontrada ou inativa');
    return disciplina;
  }

  async update(tenantId: string, id: string, data: UpdateDisciplinaPayload) {
    if (data.name) {
      const duplicate = await DisciplinaModel.findOne({ 
        tenantId,
        name: data.name, 
        _id: { $ne: id },
        isActive: true 
      });
      if (duplicate) throw new Error('Nome já está em uso por outra disciplina ativa');
    }

    const disciplina = await DisciplinaModel.findOneAndUpdate(
      { _id: id, tenantId, isActive: true },
      data,
      { new: true }
    );
    if (!disciplina) throw new Error('Disciplina não encontrada para atualização');
    return disciplina;
  }

  async softDelete(tenantId: string, id: string) {
    const disciplina = await DisciplinaModel.findOneAndUpdate(
      { _id: id, tenantId, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!disciplina) throw new Error('Disciplina não encontrada para deleção');
    return { success: true, message: 'Disciplina inativada com sucesso' };
  }
}

export const disciplinasService = new DisciplinasService();
