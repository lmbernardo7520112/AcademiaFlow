import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import mongoose from 'mongoose';

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
    const timestamp = Date.now();
    const payloadInfo = {
      name: 'Admin Alunos',
      email: `admin.alunos.${timestamp}@academiaflow.com`,
      password: 'securepassword123',
      role: 'admin',
    };
    
    // Auth Chain
    const regRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload: payloadInfo });
    expectSuccessStep('Register Admin', regRes, 201);
    const loginRes = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: payloadInfo.email, password: payloadInfo.password } });
    const loginData = expectSuccessStep('Login Admin', loginRes, 200);
    const token = loginData.data.token;

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

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
