import { AlunoModel } from '../../models/Aluno.js';
import { TurmaModel } from '../../models/Turma.js';
import { DisciplinaModel } from '../../models/Disciplina.js';
import { NotaModel } from '../../models/Nota.js';
import mongoose from 'mongoose';
import { normalizeBimestralSlots, isBimesterPeriodo } from '@academiaflow/shared';
import type { BimesterPeriodo } from '@academiaflow/shared';

export class ReportsService {
  async getDashboardMetrics(tenantId: string) {
    const ativos = await AlunoModel.countDocuments({ tenantId, isActive: true });
    const inativos = await AlunoModel.countDocuments({ tenantId, isActive: false });
    const transferidos = await AlunoModel.countDocuments({ tenantId, transferido: true });
    const evadidos = await AlunoModel.countDocuments({ tenantId, abandono: true });
    const totalAlunos = ativos + inativos;
    
    const totalTurmas = await TurmaModel.countDocuments({ tenantId, isActive: true });
    const totalDisciplinas = await DisciplinaModel.countDocuments({ tenantId, isActive: true });

    // Occupational metrics (Active Students / Total Capacity)
    const totalCapacity = totalTurmas * 40; 
    const occupancyRate = totalCapacity > 0 ? parseFloat(((ativos / totalCapacity) * 100).toFixed(1)) : 0;

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
        occupancyRate,
      },
      recentActivity: recentGrades,
    };
  }

  async getTaxasAprovacaoPorTurma(tenantId: string, year: number) {
    const turmas = await TurmaModel.find({ tenantId, year, isActive: true });
    const { notasService } = await import('../notas/notas.service.js');
    
    const results = [];
    for (const turma of turmas) {
      const disciplinasDaTurma = await DisciplinaModel.find({ 
        tenantId, 
        turmaIds: { $in: [turma._id] }, 
        isActive: true 
      });
      
      let aprovadosTotal = 0;
      let reprovadosTotal = 0;
      let recuperacaoTotal = 0;
      let count = 0;

      for (const disc of disciplinasDaTurma) {
        const boletins = await notasService.getBoletimTurma(tenantId, turma._id.toString(), disc._id.toString(), year);
        boletins.forEach(b => {
          if (b.situacao === 'Aprovado') aprovadosTotal++;
          else if (b.situacao === 'Reprovado') reprovadosTotal++;
          else if (b.situacao === 'Recuperação') recuperacaoTotal++;
          if (b.situacao !== 'Pendente') count++;
        });
      }

      results.push({
        turmaId: turma._id.toString(),
        turmaName: turma.name,
        aprovados: aprovadosTotal,
        reprovados: reprovadosTotal,
        recuperacao: recuperacaoTotal,
        taxaAprovacao: count > 0 ? parseFloat(((aprovadosTotal / count) * 100).toFixed(1)) : 0
      });
    }

    return results.sort((a, b) => b.taxaAprovacao - a.taxaAprovacao);
  }

  async getDashboardTurma(tenantId: string, turmaId: string) {
    const turma = await TurmaModel.findOne({ _id: turmaId, tenantId, isActive: true });
    if (!turma) {
      const err = new Error('Turma não encontrada ou inativa');
      (err as any).statusCode = 404;
      throw err;
    }

    // 1. KPI Aggregation (Avg, Total Students)
    const stats = await NotaModel.aggregate([
      { $match: { tenantId, turmaId: new mongoose.Types.ObjectId(turmaId) } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$value' },
          total: { $addToSet: '$alunoId' }
        }
      }
    ]);

    const averageGrade = stats.length > 0 ? parseFloat(stats[0].avg.toFixed(2)) : null;
    const totalStudents = await AlunoModel.countDocuments({ tenantId, turmaId, isActive: true });

    // 2. Distribution (Histogram)
    const distributionRaw = await NotaModel.aggregate([
      { $match: { tenantId, turmaId: new mongoose.Types.ObjectId(turmaId) } },
      {
        $bucket: {
          groupBy: '$value',
          boundaries: [0, 4, 6, 8, 10.1], // Includes 10
          default: 'Outros',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    const rangeLabels: Record<number, string> = { 0: '0-4', 4: '4-6', 6: '6-8', 8: '8-10' };
    const distribution = distributionRaw.map(d => ({
      range: rangeLabels[d._id as number] || 'Indefinido',
      count: d.count
    }));

    // 3. Students At Risk (Média < 6)
    const riskAggregation = await NotaModel.aggregate([
      { $match: { tenantId, turmaId: new mongoose.Types.ObjectId(turmaId) } },
      {
        $group: {
          _id: '$alunoId',
          avg: { $avg: '$value' }
        }
      },
      { $match: { avg: { $lt: 6 } } },
      { $sort: { avg: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'alunos',
          localField: '_id',
          foreignField: '_id',
          as: 'aluno'
        }
      },
      { $unwind: '$aluno' },
      {
        $project: {
          _id: 1,
          name: '$aluno.name',
          average: { $round: ['$avg', 2] }
        }
      }
    ]);

    // 4. Bimestral Performance — strict 4-slot DTO (Phase 2)
    const bimestralAgg = await NotaModel.aggregate([
      { $match: { tenantId, turmaId: new mongoose.Types.ObjectId(turmaId) } },
      { $group: { _id: '$bimester', avg: { $avg: '$value' } } },
      { $sort: { _id: 1 } }
    ]);

    const bimestralMap: Partial<Record<BimesterPeriodo, number | null>> = {};
    for (const entry of bimestralAgg) {
      const p = entry._id as number;
      if (isBimesterPeriodo(p)) {
        bimestralMap[p] = entry.avg !== null
          ? parseFloat(entry.avg.toFixed(2))
          : null;
      }
    }
    const performanceBimestral = normalizeBimestralSlots(bimestralMap);

    // 4. Approval Rates
    const genericTaxas = await this.getTaxasAprovacaoPorTurma(tenantId, turma.year);
    const specificTaxa = genericTaxas.find(t => t.turmaId === turmaId);

    return {
      turmaId,
      turmaName: turma.name,
      metrics: {
        averageGrade,
        approvalRate: specificTaxa?.taxaAprovacao ?? 0,
        reprovadosRate: specificTaxa ? parseFloat(((specificTaxa.reprovados / Math.max(specificTaxa.aprovados + specificTaxa.reprovados + specificTaxa.recuperacao, 1)) * 100).toFixed(1)) : 0,
        recoveryRate: specificTaxa ? parseFloat(((specificTaxa.recuperacao / Math.max(specificTaxa.aprovados + specificTaxa.reprovados + specificTaxa.recuperacao, 1)) * 100).toFixed(1)) : 0,
        totalStudents,
      },
      distribution,
      studentsAtRisk: riskAggregation,
      performanceBimestral,
    };
  }

  async getProfessorAnalytics(tenantId: string, professorId: string, turmaId: string) {
    const query: mongoose.FilterQuery<typeof DisciplinaModel> = { tenantId, professorId, isActive: true };
    
    const disciplinas = await DisciplinaModel.find(query);
    // Agrupa todas as IDs de turmas únicas atendidas pelo professor para a lista lateral
    const allTurmaIds = [...new Set(disciplinas.map(d => d.turmaIds).flat().map(id => id?.toString()).filter(Boolean))];

    // Validação de Contexto: O professor deve atender a turma solicitada
    // Se não houver turmaId fornecida ou se o professor não tiver acesso, lançamos erro
    if (!turmaId || !allTurmaIds.includes(turmaId)) {
       throw new Error('Acesso negado: Professor não leciona nesta turma.');
    }

    const objectTurmaId = new mongoose.Types.ObjectId(turmaId);

    const stats = await NotaModel.aggregate([
      { $match: { tenantId, turmaId: objectTurmaId } },
      { $group: { _id: null, avg: { $avg: '$value' } } }
    ]);

    const riskAggregation = await NotaModel.aggregate([
      { $match: { tenantId, turmaId: objectTurmaId } },
      { $group: { _id: '$alunoId', avg: { $avg: '$value' } } },
      { $match: { avg: { $lt: 6 } } },
      { $count: 'total' }
    ]);

    const classesPerformance = [];
    for (const id of allTurmaIds) {
      const turma = await TurmaModel.findById(id);
      const avg = await NotaModel.aggregate([
        { $match: { tenantId, turmaId: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, avg: { $avg: '$value' } } }
      ]);
      classesPerformance.push({
        id,
        name: turma?.name || 'Desconhecida',
        average: avg.length > 0 ? parseFloat(avg[0].avg.toFixed(2)) : null,
        trend: 'stable' as const
      });
    }

    // Contexto selecionado (Garantido pela validação acima)
    const selectedTurma = await TurmaModel.findById(turmaId);
    const context = {
      turmaId,
      turmaName: selectedTurma?.name || 'Turma Selecionada'
    };

    return {
      context,
      globalAverage: stats.length > 0 ? parseFloat(stats[0].avg.toFixed(2)) : null,
      riskTotal: riskAggregation.length > 0 ? (riskAggregation[0].total as number) : 0,
      classes: classesPerformance
    };
  }

  async getBoletimIndividual(tenantId: string, alunoId: string, year: number) {
    const aluno = await AlunoModel.findOne({ _id: alunoId, tenantId }).populate<{ turmaId: { name: string } }>('turmaId');
    if (!aluno) throw new Error('Aluno não encontrado');

    const disciplinas = await DisciplinaModel.find({ 
      tenantId, 
      turmaIds: aluno.turmaId,
      isActive: true 
    });

    const { notasService } = await import('../notas/notas.service.js');
    
    const disciplinasComNotas = await Promise.all(disciplinas.map(async (disc) => {
      const boletim = await notasService.getBoletim(tenantId, alunoId, disc._id.toString(), year);
      return {
        id: disc._id.toString(),
        name: disc.name,
        notas: {
          bimestre1: boletim.notas.bimestre1,
          bimestre2: boletim.notas.bimestre2,
          bimestre3: boletim.notas.bimestre3,
          bimestre4: boletim.notas.bimestre4,
          pf: boletim.notas.pf ?? null,
        },
        nf: boletim.nf,
        mg: boletim.mg,
        mf: boletim.mf,
        situacao: boletim.situacao
      };
    }));

    return {
      aluno: {
        id: aluno._id.toString(),
        name: aluno.name,
        matricula: aluno.matricula,
        turmaName: aluno.turmaId?.name
      },
      year,
      disciplinas: disciplinasComNotas
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
