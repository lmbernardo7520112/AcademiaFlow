import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createTestUser } from '../../test-helpers.js';

describe('Disciplinas Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }
  });

  const setupData = async () => {
    const user = await createTestUser(app, { role: 'admin' });
    return { token: user.token };
  };

  it('POST /api/disciplinas should create a new disciplina', async () => {
    const { token } = await setupData();
    const payload = {
      name: `Física ${Date.now()}`,
      codigo: `FIS-${Math.floor(Math.random() * 900) + 100}`,
      cargaHoraria: 80
    };

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
  });

  it('GET /api/disciplinas should list active disciplinas', async () => {
    const { token } = await setupData();
    // Create one first
    await app.inject({
      method: 'POST',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Química', codigo: 'QUI-101' }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
