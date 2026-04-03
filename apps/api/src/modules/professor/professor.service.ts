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
    const turmasMap = new Map<string, { _id: string; name: string }>();
    
    interface PopulatedTurma {
      _id: string;
      name: string;
    }

    disciplinas.forEach(d => {
      if (d.turmaId) {
        const turma = d.turmaId as unknown as PopulatedTurma;
        turmasMap.set(turma._id.toString(), turma);
      }
    });

    return Array.from(turmasMap.values());
  }
}



export const professorService = new ProfessorService();
