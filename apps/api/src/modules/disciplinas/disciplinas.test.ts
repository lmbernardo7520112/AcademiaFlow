import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

describe('Disciplinas Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  const getAuthToken = async () => {
    const payload = {
      name: 'Admin Disciplinas',
      email: `admin.disciplinas.${Date.now()}@academiaflow.com`,
      password: 'securepassword123',
      role: 'admin',
    };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: payload.email, password: payload.password },
    });
    return login.json().data.token;
  };

  it('POST /api/disciplinas should create a new disciplina', async () => {
    const token = await getAuthToken();
    const payload = { name: 'Matemática Avançada' };

    const response = await app.inject({
      method: 'POST',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${token}` },
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('_id');
    expect(body.data.name).toBe('Matemática Avançada');
  });

  it('POST /api/disciplinas should fail on duplicate active name', async () => {
    const token = await getAuthToken();
    const payload = { name: 'Física Clássica' };

    await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` }, payload });
    
    // Duplicate
    const response = await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` }, payload });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Já existe uma disciplina ativa com este nome');
  });

  it('GET /api/disciplinas should list active disciplinas', async () => {
    const token = await getAuthToken();
    await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Biologia' } });

    const response = await app.inject({ method: 'GET', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    
    // Confirms it's looking for biologia
    const hasBiologia = body.data.some((d: { name: string }) => d.name === 'Biologia');
    expect(hasBiologia).toBe(true);
  });

  it('GET /api/disciplinas/:id should return single disciplina', async () => {
    const token = await getAuthToken();
    const createRes = await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Química Orgânica' } });
    const dId = createRes.json().data._id;

    const response = await app.inject({ method: 'GET', url: `/api/disciplinas/${dId}`, headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().data._id).toBe(dId);
  });

  it('PUT /api/disciplinas/:id should update disciplina', async () => {
    const token = await getAuthToken();
    const createRes = await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Filosofia' } });
    const dId = createRes.json().data._id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/disciplinas/${dId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Filosofia Moderna' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.name).toBe('Filosofia Moderna');
  });

  it('DELETE /api/disciplinas/:id should soft delete disciplina', async () => {
    const token = await getAuthToken();
    const createRes = await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Sociologia' } });
    const dId = createRes.json().data._id;

    const response = await app.inject({ method: 'DELETE', url: `/api/disciplinas/${dId}`, headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const listRes = await app.inject({ method: 'GET', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` } });
    const found = listRes.json().data.find((d: { _id: string }) => d._id === dId);
    expect(found).toBeUndefined();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
