import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

describe('Notas Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  const setupData = async () => {
    // Admin user for tests
    const payloadInfo = {
      name: 'Admin Notas',
      email: `admin.notas.${Date.now()}@academiaflow.com`,
      password: 'securepassword123',
      role: 'admin',
    };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: payloadInfo });
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: payloadInfo.email, password: payloadInfo.password },
    });
    const token = login.json().data.token;

    // Create an active turma
    const turmaRes = await app.inject({
      method: 'POST',
      url: '/api/turmas',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: `Turma Notas ${Date.now()}`, year: 2026, periodo: 'noturno' }
    });
    const turmaId = turmaRes.json().data._id;

    // Create a disciplina
    const discRes = await app.inject({
      method: 'POST',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: `Matemática ${Date.now()}` }
    });
    const disciplinaId = discRes.json().data._id;

    // Create an aluno
    const alunoRes = await app.inject({
      method: 'POST',
      url: '/api/alunos',
      headers: { Authorization: `Bearer ${token}` },
      payload: { 
        name: 'Aluno Notas', 
        matricula: `MAT-${Date.now()}`, 
        turmaId,
        dataNascimento: '2005-01-01'
      }
    });
    const alunoId = alunoRes.json().data._id;

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
    expect(response.json().message).toContain('Já cadastrada');
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
    const alunoId2 = alunoRes2.json().data._id;

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
    expect(body.errorCount).toBe(0);
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
    const nId = createRes.json().data._id;

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
    const nId = createRes.json().data._id;

    const response = await app.inject({ method: 'DELETE', url: `/api/notas/${nId}`, headers: { Authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const getRes = await app.inject({ method: 'GET', url: `/api/notas/${nId}`, headers: { Authorization: `Bearer ${token}` } });
    expect(getRes.statusCode).toBe(404);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
