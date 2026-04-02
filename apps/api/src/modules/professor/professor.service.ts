import { DisciplinaModel } from '../../models/Disciplina.js';

export class ProfessorService {
  async getDisciplinesByProfessor(tenantId: string, professorId: string) {
    return DisciplinaModel.find({ 
      tenantId, 
      professorId, 
      isActive: true 
    }).populate('turmaId', 'name');
  }
}

export const professorService = new ProfessorService();
