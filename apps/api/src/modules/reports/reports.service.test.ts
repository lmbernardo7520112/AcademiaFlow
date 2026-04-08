import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { reportsService } from './reports.service.js';
import { TurmaModel } from '../../models/Turma.js';
import { NotaModel } from '../../models/Nota.js';
import { AlunoModel } from '../../models/Aluno.js';
import { DisciplinaModel } from '../../models/Disciplina.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('ReportsService - B2 Dashboard Analítico', () => {
  let mongoServer: MongoMemoryServer;
  const tenantId = new mongoose.Types.ObjectId().toString();
  let turmaId: string;
  let disciplinaId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TurmaModel.deleteMany({});
    await NotaModel.deleteMany({});
    await AlunoModel.deleteMany({});
    await DisciplinaModel.deleteMany({});

    const turma = await TurmaModel.create({
      tenantId,
      name: 'Turma B2 Test',
      year: 2026,
      periodo: 'vespertino',
      isActive: true
    });
    turmaId = turma._id.toString();

    const disciplina = await DisciplinaModel.create({
      tenantId,
      name: 'Test Disc',
      codigo: 'TES-123',
      turmaIds: [turma._id]
    });
    disciplinaId = disciplina._id.toString();
  });

  it('deve retornar métricas vazias preservando a coerência (DTO) para turma sem dados', async () => {
    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);
    
    expect(dashboard.turmaId).toBe(turmaId);
    expect(dashboard.turmaName).toBe('Turma B2 Test');
    expect(dashboard.metrics.averageGrade).toBeNull();
    expect(dashboard.metrics.totalStudents).toBe(0);
    expect(dashboard.distribution).toHaveLength(0);
    expect(dashboard.studentsAtRisk).toHaveLength(0);
    
    // Assegura coesão do DTO strict de 4 bimestres nulos
    expect(dashboard.performanceBimestral).toHaveLength(4);
    expect(dashboard.performanceBimestral[0].valor).toBeNull();
  });

  it('deve agregar os dados matemáticos corretamente para uma turma com dados', async () => {
    const aluno = await AlunoModel.create({
      tenantId,
      turmaId,
      name: 'Aluno Analítico',
      matricula: '12345',
      dataNascimento: new Date()
    });

    // Nota que gera "Risco" (menor que 6)
    await NotaModel.create({
      tenantId,
      turmaId,
      alunoId: aluno._id,
      disciplinaId,
      bimester: 1,
      year: 2026,
      value: 4.5
    });

    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);
    expect(dashboard.metrics.averageGrade).toBe(4.5);
    expect(dashboard.metrics.totalStudents).toBe(1);
    expect(dashboard.studentsAtRisk).toHaveLength(1);
    expect(dashboard.studentsAtRisk[0].name).toBe('Aluno Analítico');
    expect(dashboard.studentsAtRisk[0].average).toBe(4.5);
    expect(dashboard.performanceBimestral[0].valor).toBe(4.5);
  });

  it('deve lançar erro 404 explícito para turma inexistente ou em outro tenant', async () => {
    const otherTenantId = new mongoose.Types.ObjectId().toString();
    try {
      await reportsService.getDashboardTurma(otherTenantId, turmaId);
      expect.fail('Deveria ter lançado erro');
    } catch (error: unknown) {
      const err = error as Error & { statusCode?: number };
      expect(err.message).toBe('Turma não encontrada ou inativa');
      expect(err.statusCode).toBe(404);
    }
  });

  it('deve evitar crash sistêmico quando há múltiplas notas e turmas complexas', async () => {
    // Apenas certifica que com muitas notas o motor Mongoose/BSON continua coerente
    const p = [];
    for (let i = 0; i < 50; i++) {
        p.push(NotaModel.create({
          tenantId, turmaId, 
          alunoId: new mongoose.Types.ObjectId(), 
          disciplinaId, bimester: 2, year: 2026, value: 7.0
        }));
    }
    await Promise.all(p);

    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);
    expect(dashboard.metrics.averageGrade).toBe(7.0);
    expect(dashboard.performanceBimestral[1].valor).toBe(7.0);
  });
});
