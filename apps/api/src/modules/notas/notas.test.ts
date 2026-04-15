import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import mongoose from 'mongoose';
import { createTestUser } from '../../test-helpers.js';

describe('Notas Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    
    // FASE 2: Garantir prontidão real do banco
    if (mongoose.connection.readyState !== 1) {
      console.log('--- AGUARDANDO CONEXÃO MONGO ---');
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }
    console.log('--- BANCO DE TESTE PRONTO ---');
    mongoose.set('bufferCommands', false); // Fail fast
  });

  // FASE 1: Helper de diagnóstico obrigatório
  const expectSuccessStep = (stepName: string, response: LightMyRequestResponse, expectedStatus = 201) => {
    if (response.statusCode !== expectedStatus) {
      console.error(`\n--- FALHA NO STEP: ${stepName} ---`);
      console.error(`URL: ${response.raw.req?.method} ${response.raw.req?.url}`);
      console.error(`STATUS ESPERADO: ${expectedStatus} | RECEBIDO: ${response.statusCode}`);
      console.error(`BODY: ${JSON.stringify(response.json(), null, 2)}`);
      throw new Error(`Step ${stepName} failed with status ${response.statusCode}`);
    }
    return response.json();
  };

  const setupData = async () => {
    const timestamp = Date.now();
    
    // 1. Create Admin user directly (register requires JWT now)
    const user = await createTestUser(app, { role: 'admin' });
    const token = user.token;

    // 3. Create Turma
    const turmaRes = await app.inject({
      method: 'POST',
      url: '/api/turmas',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: `Turma Notas ${timestamp}`, year: 2026, periodo: 'noturno' }
    });
    const turmaData = expectSuccessStep('Create Turma', turmaRes, 201);
    const turmaId = turmaData.data._id;

    // 4. Create Disciplina (CORREÇÃO: Inclusão do 'codigo' obrigatório)
    const discRes = await app.inject({
      method: 'POST',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${token}` },
      payload: { 
        name: `Matemática ${timestamp}`,
        codigo: `MAT-${Math.floor(Math.random() * 900) + 100}` // Ex: MAT-123
      }
    });
    const discData = expectSuccessStep('Create Disciplina', discRes, 201);
    const disciplinaId = discData.data._id;

    // 5. Create Aluno
    const alunoRes = await app.inject({
      method: 'POST',
      url: '/api/alunos',
      headers: { Authorization: `Bearer ${token}` },
      payload: { 
        name: 'Aluno Notas', 
        matricula: `MAT-${timestamp}`, 
        turmaId,
        dataNascimento: '2005-01-01'
      }
    });
    const alunoData = expectSuccessStep('Create Aluno', alunoRes, 201);
    const alunoId = alunoData.data._id;

    return { token, turmaId, disciplinaId, alunoId };
  };

  it('POST /api/notas should create a new nota (single)', async () => {
    const { token, turmaId, disciplinaId, alunoId } = await setupData();
    const payload = {
      alunoId,
      disciplinaId,
      turmaId,
      year: 2026,
      bimester: 1,
      value: 8.5
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/notas',
      headers: { Authorization: `Bearer ${token}` },
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    // TESTE DE CONTRATO (FASE 4)
    expect(body.data).toHaveProperty('_id');
    expect(body.data.value).toBe(8.5);
  });

  it('POST /api/notas should fail on duplicate nota for same student/disciplina/bimester/year', async () => {
    const { token, turmaId, disciplinaId, alunoId } = await setupData();
    const payload = {
      alunoId,
      disciplinaId,
      turmaId,
      year: 2026,
      bimester: 2,
      value: 7.0
    };

    await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload });
    
    // Duplicate
    const response = await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Nota já cadastrada');
  });

  it('POST /api/notas/bulk should create multiple notas', async () => {
    const { token, turmaId, disciplinaId, alunoId } = await setupData();
    
    // Create second student
    const alunoRes2 = await app.inject({
      method: 'POST',
      url: '/api/alunos',
      headers: { Authorization: `Bearer ${token}` },
      payload: { 
        name: 'Aluno 2', 
        matricula: `MAT2-${Date.now()}`, 
        turmaId,
        dataNascimento: '2005-01-01'
      }
    });
    const alunoData2 = expectSuccessStep('Create Aluno 2', alunoRes2, 201);
    const alunoId2 = alunoData2.data._id;

    const payload = [
      { alunoId, disciplinaId, turmaId, year: 2026, bimester: 3, value: 9.0 },
      { alunoId: alunoId2, disciplinaId, turmaId, year: 2026, bimester: 3, value: 5.5 }
    ];

    const response = await app.inject({
      method: 'POST',
      url: '/api/notas/bulk',
      headers: { Authorization: `Bearer ${token}` },
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.successCount).toBe(2);
    expect(body.inserted.length).toBe(2);
  });

  it('GET /api/notas should list and filter notas', async () => {
    const { token, turmaId, disciplinaId, alunoId } = await setupData();
    await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year: 2026, bimester: 4, value: 10 } });

    const response = await app.inject({
      method: 'GET',
      url: `/api/notas?alunoId=${alunoId}&bimester=4`,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].alunoId).toHaveProperty('name'); // populated field
    expect(body.data[0].value).toBe(10);
  });

  it('PUT /api/notas/:id should update nota value', async () => {
    const { token, turmaId, disciplinaId, alunoId } = await setupData();
    const createRes = await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year: 2027, bimester: 1, value: 4.0 } });
    const nData = expectSuccessStep('Create Nota to Update', createRes, 201);
    const nId = nData.data._id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/notas/${nId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { value: 6.0 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.value).toBe(6.0);
  });

  it('DELETE /api/notas/:id should delete nota permanently', async () => {
    const { token, turmaId, disciplinaId, alunoId } = await setupData();
    const createRes = await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year: 2027, bimester: 2, value: 5.0 } });
    const nData = expectSuccessStep('Create Nota to Delete', createRes, 201);
    const nId = nData.data._id;

    const response = await app.inject({ method: 'DELETE', url: `/api/notas/${nId}`, headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const getRes = await app.inject({ method: 'GET', url: `/api/notas/${nId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(getRes.statusCode).toBe(404);
  });

  it('GET /api/notas/boletim/:turmaId/:disciplinaId should return PF accurately when bimester=5 exists (D2 Parity)', async () => {
    const { token, turmaId, disciplinaId, alunoId } = await setupData();
    const year = 2028; // avoid conflicts

    // Create B1, B2, B3, B4 -> MG = 4.0 (Recuperação)
    await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year, bimester: 1, value: 4.0 } });
    await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year, bimester: 2, value: 4.0 } });
    await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year, bimester: 3, value: 4.0 } });
    await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year, bimester: 4, value: 4.0 } });

    // Verify boletim BEFORE PF
    const resPre = await app.inject({ method: 'GET', url: `/api/notas/boletim/${turmaId}/${disciplinaId}?year=${year}`, headers: { Authorization: `Bearer ${token}` } });
    expect(resPre.statusCode).toBe(200);
    type BoletimResponse = { alunoId: string; mg: number | null; situacao: string; notas: { pf: number | null }; mf: number | null };
    let boletim = resPre.json().data.find((b: BoletimResponse) => b.alunoId === alunoId);
    expect(boletim.mg).toBe(4.0);
    expect(boletim.situacao).toBe('Recuperação');
    expect(boletim.notas.pf).toBeNull();
    expect(boletim.mf).toBeNull();

    // Insert PF (bimester = 5) with value = 8.0 -> MF = (4+8)/2 = 6.0 Aprovado
    await app.inject({ method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${token}` }, payload: { alunoId, disciplinaId, turmaId, year, bimester: 5, value: 8.0 } });

    // Verify boletim AFTER PF
    const resPost = await app.inject({ method: 'GET', url: `/api/notas/boletim/${turmaId}/${disciplinaId}?year=${year}`, headers: { Authorization: `Bearer ${token}` } });
    expect(resPost.statusCode).toBe(200);
    boletim = resPost.json().data.find((b: BoletimResponse) => b.alunoId === alunoId);
    
    expect(boletim.notas.pf).toBe(8.0);
    expect(boletim.mf).toBe(6.0);
    expect(boletim.situacao).toBe('Aprovado');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
