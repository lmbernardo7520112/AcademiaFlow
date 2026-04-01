import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';
import { UserModel } from '../../models/User.js';

describe('Auth Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  it('POST /api/auth/register should create a new user', async () => {
    const payload = {
      name: 'Leonardo Bernardo',
      email: 'leo@academiaflow.com',
      password: 'strongpassword123'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload
    });

    if (response.statusCode === 500) {
      console.log('500 ERROR BODY:', response.json());
    }

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(payload.name);
    expect(body.data.email).toBe(payload.email);
    expect(body.data.password).toBeUndefined(); // Password should not be returned
    expect(body.data.role).toBe('professor'); // Default role
  });

  it('POST /api/auth/register should fail on duplicate email', async () => {
    const payload = {
      name: 'Leonardo Bernardo',
      email: 'leo@academiaflow.com',
      password: 'strongpassword123'
    };

    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    
    // Try again
    const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it('POST /api/auth/login should authenticate and return token', async () => {
    const payload = {
      name: 'Leonardo Bernardo',
      email: 'leo@academiaflow.com',
      password: 'strongpassword123'
    };

    await app.inject({ method: 'POST', url: '/api/auth/register', payload });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: payload.email,
        password: payload.password
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const body = loginResponse.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe(payload.email);
  });

  it('GET /api/auth/me should return current user info if authenticated', async () => {
    const payload = {
      name: 'Leonardo Bernardo',
      email: 'leo@academiaflow.com',
      password: 'strongpassword123'
    };

    await app.inject({ method: 'POST', url: '/api/auth/register', payload });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: payload.email,
        password: payload.password
      }
    });

    const token = loginResponse.json().data.token;

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().success).toBe(true);
    expect(meResponse.json().data.email).toBe(payload.email);
  });

  it('GET /api/auth/me should fail if no token provided', async () => {
    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(meResponse.statusCode).toBe(401);
  });
});
