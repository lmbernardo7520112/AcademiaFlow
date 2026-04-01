import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

describe('Alunos Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  const setupData = async () => {
    // Admin user for tests
    const payload = {
      name: 'Admin Alunos',
      email: `admin.alunos.${Date.now()}@academiaflow.com`,
      password: 'securepassword123',
      role: 'admin',
    };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: payload.email, password: payload.password },
    });
    const token = login.json().data.token;

    // Create an active turma for associations
    const turmaPayload = { name: `Turma Teste Alunos ${Date.now()}`, year: 2026, periodo: 'noturno' };
    const turmaRes = await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${token}` }, payload: turmaPayload });
    const turmaId = turmaRes.json().data._id;

    return { token, turmaId };
  };

  it('POST /api/alunos should create a new aluno', async () => {
    const { token, turmaId } = await setupData();
    const payload = { 
      name: 'João Silva', 
      email: `joao.${Date.now()}@test.com`, 
      matricula: `MAT-${Date.now()}`, 
      turmaId,
      dataNascimento: '2005-01-01',
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
    expect(body.data.name).toBe('João Silva');
  });

  it('POST /api/alunos should fail with non-existent turma', async () => {
    const { token } = await setupData();
    const payload = { 
      name: 'Pedro Costa', 
      email: `pedro.${Date.now()}@test.com`, 
      matricula: `MAT-${Date.now()}`, 
      dataNascimento: '2005-01-01',
      turmaId: '60c72b2f9b1d8b001c8e4d3a' // fake valid objectId
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/alunos',
      headers: { Authorization: `Bearer ${token}` },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Turma informada não foi encontrada ou está inativa');
  });

  it('POST /api/alunos should fail on duplicate matricula', async () => {
    const { token, turmaId } = await setupData();
    const matricula = `MAT-DUP-${Date.now()}`;
    const payload = { name: 'Ana Oliveira', matricula, turmaId, dataNascimento: '2005-01-01' };

    await app.inject({ method: 'POST', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` }, payload });
    
    // Duplicate
    const response = await app.inject({ method: 'POST', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` }, payload: { ...payload, name: 'Ana 2' } });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Já existe um aluno ativo com esta matrícula');
  });

  it('GET /api/alunos should list active alunos populated with turma', async () => {
    const { token, turmaId } = await setupData();
    await app.inject({ method: 'POST', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Marcos', matricula: `MAT-${Date.now()}`, turmaId, dataNascimento: '2005-01-01' } });

    const response = await app.inject({ method: 'GET', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].turmaId).toHaveProperty('name'); // ensure it's populated
  });

  it('GET /api/alunos/:id should return single aluno', async () => {
    const { token, turmaId } = await setupData();
    const createRes = await app.inject({ method: 'POST', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Julia', matricula: `MAT-${Date.now()}`, turmaId, dataNascimento: '2005-01-01' } });
    const aId = createRes.json().data._id;

    const response = await app.inject({ method: 'GET', url: `/api/alunos/${aId}`, headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().data._id).toBe(aId);
  });

  it('PUT /api/alunos/:id should update aluno properties', async () => {
    const { token, turmaId } = await setupData();
    const createRes = await app.inject({ method: 'POST', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Fernando', matricula: `MAT-${Date.now()}`, turmaId, dataNascimento: '2005-01-01' } });
    const aId = createRes.json().data._id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/alunos/${aId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Fernando Silva' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.name).toBe('Fernando Silva');
  });

  it('DELETE /api/alunos/:id should soft delete aluno', async () => {
    const { token, turmaId } = await setupData();
    const createRes = await app.inject({ method: 'POST', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'Roberta', matricula: `MAT-${Date.now()}`, turmaId, dataNascimento: '2005-01-01' } });
    const aId = createRes.json().data._id;

    const response = await app.inject({ method: 'DELETE', url: `/api/alunos/${aId}`, headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const listRes = await app.inject({ method: 'GET', url: '/api/alunos', headers: { Authorization: `Bearer ${token}` } });
    const found = listRes.json().data.find((a: { _id: string }) => a._id === aId);
    expect(found).toBeUndefined();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
