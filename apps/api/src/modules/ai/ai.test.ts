import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import mongoose from 'mongoose';

describe('AI Engine Module Integration (Mocked Provider)', () => {
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
      name: 'Admin AI',
      email: `admin.ai.${timestamp}@academiaflow.com`,
      password: 'securepassword123',
      role: 'admin',
    };
    
    // 1. Setup dependências: Admin -> Turma
    const regRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload: payloadInfo });
    expectSuccessStep('Register Admin', regRes, 201);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: payloadInfo.email, password: payloadInfo.password },
    });
    const loginData = expectSuccessStep('Login Admin', loginRes, 200);
    const token = loginData.data.token;
    const userId = loginData.data.user._id;

    // IA Reactor exige vínculo com Turma: Criando Turma síncronamente
    const turmaRes = await app.inject({
      method: 'POST',
      url: '/api/turmas',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Turma AI Test', year: 2026 }
    });
    const turmaData = expectSuccessStep('Create Turma', turmaRes, 201);
    const turmaId = turmaData.data._id;

    // 2. Criar Disciplina VINCULADA à Turma (Requisito de ValidacaoPedagogica)
    const discRes = await app.inject({
      method: 'POST',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${token}` },
      payload: { 
        name: 'Matemática', 
        codigo: `MAT-${Math.floor(Math.random() * 900) + 100}`,
        turmaId, // VÍNCULO OBRIGATÓRIO PARA O TESTE
        professorId: userId // OBRIGATÓRIO PARA PERSISTIR VALIDACAO PEDAGOGICA
      }
    });
    const discData = expectSuccessStep('Create Disc', discRes, 201);
    const disciplinaId = discData.data._id;

    return { token, disciplinaId };
  };

  it('POST /api/ai/pedagogical/analysis should return analysis using mocked LLM', async () => {
    const { token, disciplinaId } = await setupData();
    const payload = {
      disciplinaId,
      bimester: 1,
      year: 2026
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/pedagogical/analysis',
      headers: { Authorization: `Bearer ${token}` },
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
