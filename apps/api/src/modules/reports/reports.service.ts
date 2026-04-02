import { AlunoModel } from '../../models/Aluno.js';
import { TurmaModel } from '../../models/Turma.js';
import { DisciplinaModel } from '../../models/Disciplina.js';
import { NotaModel } from '../../models/Nota.js';

export class ReportsService {
  async getDashboardMetrics(tenantId: string) {
    const ativos = await AlunoModel.countDocuments({ tenantId, isActive: true });
    const inativos = await AlunoModel.countDocuments({ tenantId, isActive: false });
    const transferidos = await AlunoModel.countDocuments({ tenantId, transferido: true });
    const evadidos = await AlunoModel.countDocuments({ tenantId, abandono: true });
    const totalAlunos = ativos + inativos;
    
    const totalTurmas = await TurmaModel.countDocuments({ tenantId, isActive: true });
    const totalDisciplinas = await DisciplinaModel.countDocuments({ tenantId, isActive: true });

    // Calculate system average grade
    const avgScoreAggregation = await NotaModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: null, avgValue: { $avg: '$value' } } },
    ]);
    const overallAverage = avgScoreAggregation.length > 0 ? parseFloat(avgScoreAggregation[0].avgValue.toFixed(2)) : null;

    const recentGrades = await NotaModel.find({ tenantId })
      .populate('alunoId', 'name matricula')
      .populate('disciplinaId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      kpis: {
        totalAlunos,
        ativos,
        inativos,
        transferidos,
        evadidos,
        totalTurmas,
        totalDisciplinas,
        overallAverage,
      },
      recentActivity: recentGrades,
    };
  }

  async getTaxasAprovacaoPorTurma(tenantId: string, year: number) {
    const turmas = await TurmaModel.find({ tenantId, year, isActive: true });
    const disciplinas = await DisciplinaModel.find({ tenantId, isActive: true });
    
    const results = [];
    
    // Using import inside method to avoid circular dependency just in case, but top level is fine.
    // For now we'll require it from notas.service
    const { notasService } = await import('../notas/notas.service.js');

    for (const turma of turmas) {
      let aprovados = 0;
      let reprovados = 0;
      let recuperacao = 0;
      let totalAvaliacoes = 0;

      for (const disciplina of disciplinas) {
        const boletins = await notasService.getBoletimTurma(tenantId, turma._id.toString(), disciplina._id.toString(), year);
        for (const boletim of boletins) {
          if (boletim.situacao === 'Aprovado') aprovados++;
          else if (boletim.situacao === 'Reprovado') reprovados++;
          else if (boletim.situacao === 'Recuperação') recuperacao++;
          
          if (boletim.situacao !== 'Pendente') totalAvaliacoes++;
        }
      }

      results.push({
        turmaId: turma._id,
        turmaName: turma.name,
        aprovados,
        reprovados,
        recuperacao,
        totalAvaliacoes,
        taxaAprovacao: totalAvaliacoes > 0 ? parseFloat(((aprovados / totalAvaliacoes) * 100).toFixed(1)) : 0
      });
    }

    // Sort by taxaAprovacao descending
    return results.sort((a, b) => b.taxaAprovacao - a.taxaAprovacao);
  }

  async getDashboardTurma(tenantId: string, turmaId: string) {
    const turma = await TurmaModel.findOne({ _id: turmaId, tenantId, isActive: true });
    if (!turma) throw new Error('Turma não encontrada');

    const totalAlunos = await AlunoModel.countDocuments({ tenantId, turmaId, isActive: true });
    
    return {
      turmaName: turma.name,
      turmaYear: turma.year,
      totalAlunos,
      // Expandable logically
    };
  }

  async exportBoletinsTurmaToExcel(tenantId: string, turmaId: string, year: number) {
    const turma = await TurmaModel.findOne({ _id: turmaId, tenantId });
    if (!turma) throw new Error('Turma não encontrada');
    const disciplinas = await DisciplinaModel.find({ tenantId, isActive: true });

    const { notasService } = await import('../notas/notas.service.js');
    const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
    
    const allBoletins = [];
    for (const disciplina of disciplinas) {
      const boletins = await notasService.getBoletimTurma(tenantId, turmaId, disciplina._id.toString(), year);
      allBoletins.push(...boletins);
    }

    // Sort by Aluno essentially
    allBoletins.sort((a, b) => a.alunoName.localeCompare(b.alunoName));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Boletins - ${turma.name}`);

    worksheet.columns = [
      { header: 'Aluno', key: 'alunoName', width: 30 },
      { header: 'Matrícula', key: 'matricula', width: 15 },
      { header: 'Disciplina', key: 'disciplinaName', width: 25 },
      { header: 'B1', key: 'b1', width: 10 },
      { header: 'B2', key: 'b2', width: 10 },
      { header: 'B3', key: 'b3', width: 10 },
      { header: 'B4', key: 'b4', width: 10 },
      { header: 'PF', key: 'pf', width: 10 },
      { header: 'MG', key: 'mg', width: 10 },
      { header: 'MF', key: 'mf', width: 10 },
      { header: 'Situação', key: 'situacao', width: 15 },
    ];

    allBoletins.forEach(b => {
      worksheet.addRow({
        alunoName: b.alunoName,
        matricula: b.matricula,
        disciplinaName: b.disciplinaName,
        b1: b.notas.bimestre1 ?? '-',
        b2: b.notas.bimestre2 ?? '-',
        b3: b.notas.bimestre3 ?? '-',
        b4: b.notas.bimestre4 ?? '-',
        pf: b.notas.pf ?? '-',
        mg: b.mg ?? '-',
        mf: b.mf ?? '-',
        situacao: b.situacao,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, filename: `Boletins_${turma.name.replace(/\s+/g, '_')}_${year}.xlsx` };
  }
}

export const reportsService = new ReportsService();
