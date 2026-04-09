import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import mongoose from 'mongoose';

describe('Disciplinas Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }
  });

  // FASE 1: Helper de diagnóstico
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
      name: 'Admin Disc',
      email: `admin.disc.${timestamp}@academiaflow.com`,
      password: 'securepassword123',
      role: 'admin',
    };
    
    const regRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload: payloadInfo });
    expectSuccessStep('Register', regRes, 201);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: payloadInfo.email, password: payloadInfo.password },
    });
    const loginData = expectSuccessStep('Login', loginRes, 200);
    return { token: loginData.data.token };
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
