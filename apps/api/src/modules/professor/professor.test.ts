import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import mongoose from 'mongoose';
import { UserModel } from '../../models/User.js';

describe('Professor Module Integration', () => {
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
      throw new Error(`Step ${stepName} failed with status ${response.statusCode}`);
    }
    return response.json();
  };

  const setupProfessor = async () => {
    const timestamp = Date.now();
    const payload = {
      name: 'Prof Test',
      email: `prof.${timestamp}@test.com`,
      password: 'password123',
      role: 'professor'
    };
    
    const regRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    expectSuccessStep('Register Prof', regRes, 201);
    const loginRes = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: payload.email, password: payload.password } });
    const loginData = expectSuccessStep('Login Prof', loginRes, 200);
    
    // Create Turma and Discipline as Admin (Professors cannot create)
    const token = loginData.data.token;
    const userId = loginData.data.user._id;
    const tenantId = loginData.data.user.tenantId;

    const adminPayload = {
      name: 'Admin Setup',
      email: `admin.setup.${timestamp}@test.com`,
      password: 'password123',
      role: 'admin'
    };
    const adminRegRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload: adminPayload });
    const adminId = adminRegRes.json().data._id;
    
    // ALINHAMENTO DE TENANT: Obrigatório para que o admin consiga criar recursos para o professor
    await UserModel.findByIdAndUpdate(adminId, { tenantId });
    
    const adminLoginRes = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: adminPayload.email, password: adminPayload.password } });
    const adminToken = expectSuccessStep('Login Admin', adminLoginRes, 200).data.token;

    const turmaRes = await app.inject({
      method: 'POST',
      url: '/api/turmas',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: 'Turma Prof', year: 2026 }
    });
    const turmaId = expectSuccessStep('Create Turma', turmaRes, 201).data._id;

    await app.inject({
      method: 'POST',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: 'Disciplina Prof', codigo: `MAT-${Math.floor(Math.random() * 899) + 100}`, turmaId, professorId: userId }
    });

    return { token, userId, tenantId, turmaId };
  };




  it('GET /api/professor/turmas should return unique classes assigned to professor', async () => {
    const { token, turmaId } = await setupProfessor();

    const response = await app.inject({
      method: 'GET',
      url: '/api/professor/turmas',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]._id).toBe(turmaId);
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
