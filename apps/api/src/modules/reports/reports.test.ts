import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

describe('Reports Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  const getAuthToken = async () => {
    const payload = {
      name: 'Admin Reports',
      email: `admin.reports.${Date.now()}@academiaflow.com`,
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

  it('GET /api/reports/dashboard should return system metrics', async () => {
    const token = await getAuthToken();

    // Just creating a few dummy datasets to populate the DB logic
    await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${token}` }, payload: { name: 'História' } });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/dashboard',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('kpis');
    expect(body.data.kpis).toHaveProperty('totalAlunos');
    expect(body.data.kpis).toHaveProperty('totalTurmas');
    expect(body.data.kpis).toHaveProperty('totalDisciplinas');
    expect(body.data.kpis).toHaveProperty('overallAverage');
    expect(body.data).toHaveProperty('recentActivity');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
