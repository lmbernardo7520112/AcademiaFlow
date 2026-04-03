import { DisciplinaModel } from '../../models/Disciplina.js';

export class ProfessorService {
  async getDisciplinesByProfessor(tenantId: string, professorId: string) {
    return DisciplinaModel.find({ 
      tenantId, 
      professorId, 
      isActive: true 
    }).populate('turmaId', 'name');
  }

  async getProfessorTurmas(tenantId: string, professorId: string) {
    const disciplinas = await DisciplinaModel.find({ 
      tenantId, 
      professorId, 
      isActive: true 
    }).populate('turmaId');

    // Extrair turmas únicas
    const turmasMap = new Map();
    disciplinas.forEach(d => {
      if (d.turmaId) {
        const turma = d.turmaId as any;
        turmasMap.set(turma._id.toString(), turma);
      }
    });

    return Array.from(turmasMap.values());
  }
}


export const professorService = new ProfessorService();
