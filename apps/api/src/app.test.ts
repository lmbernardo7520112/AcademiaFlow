import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

describe('API Health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/ping should return status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/ping',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GET / should return API info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.message).toBe('AcademiaFlow API v1.2.0');
  });

  it('GET /unknown should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/unknown-route',
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('CORS Preflight', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('preflight allows PATCH method (status transitions)', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/busca-ativa/cases/fake-id/status',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type,authorization',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
  });

  it('preflight allows PUT method (replace import)', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/busca-ativa/imports/fake-id/replace',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'content-type,authorization',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-methods']).toContain('PUT');
  });

  it('preflight allows DELETE method', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/busca-ativa/cases/fake-id',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'DELETE',
        'access-control-request-headers': 'authorization',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-methods']).toContain('DELETE');
  });
});
