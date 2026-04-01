import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

describe('Turmas Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    
    // Create an admin user to get the token, since tests are isolated we need it in beforeAll?
    // Wait, if setup.ts wipes db afterEach, token user will be wiped!
    // We must create token inside each test, OR remove the global DB wipe.
    // Instead of messing with setup, let's create a helper inside describe.
  });

  const getAuthToken = async () => {
    // Admin user for tests
    const payload = {
      name: 'Admin Turmas',
      email: `admin.${Date.now()}@academiaflow.com`,
      password: 'securepassword123',
      role: 'admin',
    };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: payload.email, password: payload.password } });
    return login.json().data.token;
  };

  it('POST /api/turmas should create a new turma', async () => {
    const tkn = await getAuthToken();
    const payload = { name: 'Matemática Avançada', year: 2026, periodo: 'vespertino' };

    const response = await app.inject({
      method: 'POST',
      url: '/api/turmas',
      headers: { Authorization: `Bearer ${tkn}` },
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
  });

  it('POST /api/turmas should fail on duplicate active turma', async () => {
    const tkn = await getAuthToken();
    const payload = { name: 'Física I', year: 2026, periodo: 'matutino' };

    await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` }, payload });
    
    // Duplicate
    const response = await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` }, payload });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Já existe uma turma ativa');
  });

  it('GET /api/turmas should list active turmas', async () => {
    const tkn = await getAuthToken();
    await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` }, payload: { name: 'Biologia', year: 2026 } });

    const response = await app.inject({ method: 'GET', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` } });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].name).toBe('Biologia');
  });

  it('GET /api/turmas/:id should return single turma', async () => {
    const tkn = await getAuthToken();
    const createRes = await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` }, payload: { name: 'Química', year: 2026 } });
    const tId = createRes.json().data._id;

    const response = await app.inject({ method: 'GET', url: `/api/turmas/${tId}`, headers: { Authorization: `Bearer ${tkn}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().data._id).toBe(tId);
  });

  it('PUT /api/turmas/:id should update turma', async () => {
    const tkn = await getAuthToken();
    const createRes = await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` }, payload: { name: 'Filosofia', year: 2026 } });
    const tId = createRes.json().data._id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/turmas/${tId}`,
      headers: { Authorization: `Bearer ${tkn}` },
      payload: { name: 'Filosofia Moderna' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.name).toBe('Filosofia Moderna');
  });

  it('DELETE /api/turmas/:id should soft delete turma', async () => {
    const tkn = await getAuthToken();
    const createRes = await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` }, payload: { name: 'Sociologia', year: 2026 } });
    const tId = createRes.json().data._id;

    const response = await app.inject({ method: 'DELETE', url: `/api/turmas/${tId}`, headers: { Authorization: `Bearer ${tkn}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const listRes = await app.inject({ method: 'GET', url: '/api/turmas', headers: { Authorization: `Bearer ${tkn}` } });
    const found = listRes.json().data.find((t: { _id: string }) => t._id === tId);
    expect(found).toBeUndefined();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
