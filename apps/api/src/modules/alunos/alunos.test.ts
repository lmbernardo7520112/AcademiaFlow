import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import mongoose from 'mongoose';
import { createTestUser } from '../../test-helpers.js';

describe('Alunos Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }
  });

  const expectSuccessStep = (stepName: string, response: LightMyRequestResponse, expectedStatus = 201) => {
    if (response.statusCode !== expectedStatus) {
      console.error(`\n--- FALHA NO STEP API: ${stepName} ---`);
      console.error(`URL: ${response.raw.req?.method} ${response.raw.req?.url}`);
      console.error(`STATUS: ${response.statusCode} | BODY: ${JSON.stringify(response.json(), null, 2)}`);
      throw new Error(`Step ${stepName} failed`);
    }
    return response.json();
  };

  const setupData = async () => {
    const user = await createTestUser(app, { role: 'admin' });
    const token = user.token;

    // Turma dependency
    const turmaRes = await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Turma Alunos', year: 2026 } });
    const turmaData = expectSuccessStep('Create Turma', turmaRes, 201);
    const turmaId = turmaData.data._id;

    return { token, turmaId };
  };

  it('POST /api/alunos should create a new aluno', async () => {
    const { token, turmaId } = await setupData();
    const payload = {
      name: 'Aluno Teste',
      matricula: `ALU-${Date.now()}`,
      turmaId,
      dataNascimento: '2010-05-15'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/alunos',
      headers: { Authorization: `Bearer ${token}` },
      payload,
    });
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    return body.data._id;
  });


  it('PATCH /api/alunos/:id/status should update status and respect exclusivity', async () => {
    const { token, turmaId } = await setupData();
    
    // 1. CREATE ALUNO
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/alunos',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Aluno Status', matricula: `ST-${Date.now()}`, turmaId, dataNascimento: '2010-01-01' }
    });
    const alunoId = createRes.json().data._id;

    // 2. UPDATE TRANSFERIDO
    const transRes = await app.inject({
      method: 'PATCH',
      url: `/api/alunos/${alunoId}/status`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { transferido: true }
    });
    expect(transRes.statusCode).toBe(200);
    expect(transRes.json().data.transferido).toBe(true);

    // 3. FAIL IF BOTH TRUE (EXCLUSIVITY)
    const bothRes = await app.inject({
      method: 'PATCH',
      url: `/api/alunos/${alunoId}/status`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { transferido: true, abandono: true }
    });
    // Fastify Zod provider defaults to 400 for schema validation errors
    expect(bothRes.statusCode).toBe(400);

    // 4. FAIL IF EMPTY PAYLOAD
    const emptyRes = await app.inject({
      method: 'PATCH',
      url: `/api/alunos/${alunoId}/status`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {}
    });
    expect(emptyRes.statusCode).toBe(400);
  });



  afterAll(async () => {
    if (app) await app.close();
  });
});
