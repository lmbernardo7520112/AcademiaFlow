import { AlunoModel } from '../../models/Aluno.js';
import { TurmaModel } from '../../models/Turma.js';
import { DisciplinaModel } from '../../models/Disciplina.js';
import { NotaModel } from '../../models/Nota.js';

export class ReportsService {
  async getDashboardMetrics(tenantId: string) {
    const totalAlunos = await AlunoModel.countDocuments({ tenantId, isActive: true });
    const totalTurmas = await TurmaModel.countDocuments({ tenantId, isActive: true });
    const totalDisciplinas = await DisciplinaModel.countDocuments({ tenantId, isActive: true });

    // Calculate system average grade
    const avgScoreAggregation = await NotaModel.aggregate([
      {
        $match: { tenantId }
      },
      {
        $group: {
          _id: null,
          avgValue: { $avg: '$value' },
        },
      },
    ]);
    const overallAverage = avgScoreAggregation.length > 0 ? parseFloat(avgScoreAggregation[0].avgValue.toFixed(2)) : null;

    // Get 5 recent grades logged
    const recentGrades = await NotaModel.find({ tenantId })
      .populate('alunoId', 'name matricula')
      .populate('disciplinaId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      kpis: {
        totalAlunos,
        totalTurmas,
        totalDisciplinas,
        overallAverage,
      },
      recentActivity: recentGrades,
    };
  }
}

export const reportsService = new ReportsService();
