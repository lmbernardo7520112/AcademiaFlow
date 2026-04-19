import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';
import { UserModel } from '../../models/User.js';
import { createTestUser } from '../../test-helpers.js';

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

  it('POST /api/auth/register should create a new user (admin auth required)', async () => {
    const admin = await createTestUser(app, { role: 'admin' });
    const payload = {
      name: 'Leonardo Bernardo',
      email: 'leo@academiaflow.com',
      password: 'strongpassword123'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { Authorization: `Bearer ${admin.token}` },
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
    const admin = await createTestUser(app, { role: 'admin' });
    const payload = {
      name: 'Leonardo Bernardo',
      email: 'leo@academiaflow.com',
      password: 'strongpassword123'
    };

    await app.inject({ method: 'POST', url: '/api/auth/register', headers: { Authorization: `Bearer ${admin.token}` }, payload });
    
    // Try again
    const response = await app.inject({ method: 'POST', url: '/api/auth/register', headers: { Authorization: `Bearer ${admin.token}` }, payload });
    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it('POST /api/auth/login should authenticate and return token', async () => {
    // Create user directly since register requires JWT admin
    await createTestUser(app, { role: 'professor', email: 'leo2@academiaflow.com', password: 'strongpassword123' });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'leo2@academiaflow.com',
        password: 'strongpassword123'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const body = loginResponse.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('leo2@academiaflow.com');
  });

  it('GET /api/auth/me should return current user info if authenticated', async () => {
    await createTestUser(app, { role: 'professor', email: 'leo3@academiaflow.com', password: 'strongpassword123' });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'leo3@academiaflow.com',
        password: 'strongpassword123'
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
    expect(meResponse.json().data.email).toBe('leo3@academiaflow.com');
  });
  it('GET /api/auth/me should fail if no token provided', async () => {
    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(meResponse.statusCode).toBe(401);
  });

  it('GET /api/auth/users should list users for admin/secretaria and omit sensitive fields', async () => {
    // Create an admin
    const admin = await UserModel.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hash',
      role: 'admin',
      tenantId: 'tenant-1'
    });

    const token = await app.jwt.sign({ id: String(admin._id), role: admin.role, tenantId: admin.tenantId });

    // Create another user in same tenant
    await UserModel.create({
      name: 'Other User',
      email: 'other@test.com',
      password: 'hash',
      role: 'professor',
      tenantId: 'tenant-1'
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/users',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(1);
    
    // Security Check: No password or refreshToken in response
    expect(body.data[0]).not.toHaveProperty('password');
    expect(body.data[0]).not.toHaveProperty('refreshToken');
  });

  it('GET /api/auth/users should return 403 for professor role', async () => {
    const prof = await UserModel.create({
      name: 'Prof User',
      email: 'prof@test.com',
      password: 'hash',
      role: 'professor',
      tenantId: 'tenant-1'
    });

    const token = await app.jwt.sign({ id: String(prof._id), role: prof.role, tenantId: prof.tenantId });

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/users',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(403);
  });

  it('POST /api/auth/logout should clear refresh token', async () => {
    const user = await UserModel.create({
      name: 'Logout User',
      email: 'logout@test.com',
      password: 'hash',
      refreshToken: 'some-token',
      role: 'professor',
      tenantId: 'tenant-1'
    });

    const token = await app.jwt.sign({ id: String(user._id), role: user.role, tenantId: user.tenantId });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const updatedUser = await UserModel.findById(user._id).select('+refreshToken');
    expect(updatedUser?.refreshToken).toBeNull();
  });

});

