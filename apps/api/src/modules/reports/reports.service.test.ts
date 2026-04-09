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
    if (mongoose.connection.readyState === 0) {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
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
    // Com zero-fill, distribution SEMPRE tem 4 faixas (count=0 para faixas sem notas)
    expect(dashboard.distribution).toHaveLength(4);
    dashboard.distribution.forEach(faixa => expect(faixa.count).toBe(0));
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
    // Assegura que o MongoDB ID foi convertido para string no payload para bater com o formato Zod
    expect(typeof dashboard.studentsAtRisk[0]._id).toBe('string');
    expect(dashboard.performanceBimestral[0].valor).toBe(4.5);
  });

  it('deve processar de forma segura notas sem valor numérico (value: null)', async () => {
    const aluno = await AlunoModel.create({
      tenantId,
      turmaId,
      name: 'Aluno Com Null',
      matricula: 'NUL-123',
      dataNascimento: new Date()
    });

    // Insere uma nota sem valor (representando registro sem submissão final)
    await NotaModel.create({
      tenantId,
      turmaId,
      alunoId: aluno._id,
      disciplinaId,
      bimester: 1,
      year: 2026,
      value: null
    });

    // Esta chamada falharia antes da correção com TypeError (reading 'toFixed' of null)
    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);
    
    // A média geral deve vir null já que não há nota numéricas para somar
    expect(dashboard.metrics.averageGrade).toBeNull();
    // A performance bimestral deve vir null
    expect(dashboard.performanceBimestral[0].valor).toBeNull();
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

describe('ReportsService - D1 Histogram Zero-Fill', () => {
  let mongoServer: MongoMemoryServer;
  const tenantId = new mongoose.Types.ObjectId().toString();
  let turmaId: string;
  let disciplinaId: string;
  let alunoId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await TurmaModel.deleteMany({});
    await NotaModel.deleteMany({});
    await AlunoModel.deleteMany({});
    await DisciplinaModel.deleteMany({});

    const turma = await TurmaModel.create({
      tenantId, name: 'Turma ZeroFill', year: 2026, periodo: 'matutino', isActive: true
    });
    turmaId = turma._id.toString();

    const disciplina = await DisciplinaModel.create({
      tenantId, name: 'Disc ZF', codigo: 'ZF-001', turmaIds: [turma._id]
    });
    disciplinaId = disciplina._id.toString();

    const aluno = await AlunoModel.create({
      tenantId, turmaId, name: 'Aluno ZF', matricula: 'ZF-001', dataNascimento: new Date()
    });
    alunoId = aluno._id.toString();
  });

  it('D1-ZF-01: distribution deve sempre ter 4 faixas mesmo quando notas concentradas em 1 faixa', async () => {
    // Insere notas APENAS na faixa 6-8 → $bucket sem zero-fill retornaria só 1 elemento
    await NotaModel.create({
      tenantId, turmaId, alunoId, disciplinaId,
      bimester: 1, year: 2026, value: 7.0
    });

    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);

    // INVARIANTE MANDATÓRIA: distribution sempre tem 4 faixas
    expect(dashboard.distribution).toHaveLength(4);

    // Faixa com nota deve ter count > 0
    const faixa68 = dashboard.distribution.find(d => d.range === '6-8');
    expect(faixa68).toBeDefined();
    expect(faixa68!.count).toBe(1);

    // Faixas sem notas devem ter count = 0 (zero-fill), NÃO serem omitidas
    const faixa04 = dashboard.distribution.find(d => d.range === '0-4');
    expect(faixa04).toBeDefined();
    expect(faixa04!.count).toBe(0);

    const faixa46 = dashboard.distribution.find(d => d.range === '4-6');
    expect(faixa46).toBeDefined();
    expect(faixa46!.count).toBe(0);

    const faixa810 = dashboard.distribution.find(d => d.range === '8-10');
    expect(faixa810).toBeDefined();
    expect(faixa810!.count).toBe(0);
  });

  it('D1-ZF-02: distribution com notas em todas as 4 faixas retorna counts corretos', async () => {
    const notasData = [
      { value: 2.0, bimester: 1 }, // faixa 0-4
      { value: 5.0, bimester: 2 }, // faixa 4-6
      { value: 7.0, bimester: 3 }, // faixa 6-8
      { value: 9.0, bimester: 4 }, // faixa 8-10
    ];

    for (const n of notasData) {
      await NotaModel.create({
        tenantId, turmaId, alunoId, disciplinaId,
        bimester: n.bimester, year: 2026, value: n.value
      });
    }

    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);

    expect(dashboard.distribution).toHaveLength(4);
    expect(dashboard.distribution.find(d => d.range === '0-4')?.count).toBe(1);
    expect(dashboard.distribution.find(d => d.range === '4-6')?.count).toBe(1);
    expect(dashboard.distribution.find(d => d.range === '6-8')?.count).toBe(1);
    expect(dashboard.distribution.find(d => d.range === '8-10')?.count).toBe(1);
  });

  it('D1-ZF-03: turma sem nenhuma nota retorna distribution com 4 faixas todas zeradas', async () => {
    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);

    expect(dashboard.distribution).toHaveLength(4);
    dashboard.distribution.forEach(faixa => {
      expect(faixa.count).toBe(0);
    });
  });

  it('D1-ZF-04: nota com valor 10 deve cair na faixa 8-10 (boundary inclusivo)', async () => {
    await NotaModel.create({
      tenantId, turmaId, alunoId, disciplinaId,
      bimester: 1, year: 2026, value: 10
    });

    const dashboard = await reportsService.getDashboardTurma(tenantId, turmaId);
    const faixa810 = dashboard.distribution.find(d => d.range === '8-10');
    expect(faixa810?.count).toBe(1);
  });
});
