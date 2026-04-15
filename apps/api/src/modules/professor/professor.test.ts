import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import mongoose from 'mongoose';
import { createTestUser } from '../../test-helpers.js';

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
    // Create shared tenantId so professor and admin belong to same tenant
    const tenantId = new mongoose.Types.ObjectId().toString();

    const prof = await createTestUser(app, { role: 'professor', tenantId });
    const admin = await createTestUser(app, { role: 'admin', tenantId });

    const turmaRes = await app.inject({
      method: 'POST',
      url: '/api/turmas',
      headers: { Authorization: `Bearer ${admin.token}` },
      payload: { name: 'Turma Prof', year: 2026 }
    });
    const turmaId = expectSuccessStep('Create Turma', turmaRes, 201).data._id;

    await app.inject({
      method: 'POST',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${admin.token}` },
      payload: { name: 'Disciplina Prof', codigo: `MAT-${Math.floor(Math.random() * 899) + 100}`, turmaIds: [turmaId], professorId: String(prof._id) }
    });

    return { token: prof.token, userId: String(prof._id), tenantId, turmaId };
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
