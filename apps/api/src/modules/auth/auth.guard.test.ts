import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';
import { UserModel } from '../../models/User.js';
import argon2 from 'argon2';

describe('Auth Guards — school_production mode', () => {
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

  describe('POST /api/auth/register — self-provisioning guard', () => {
    it('should return 403 when APP_MODE=school_production', async () => {
      // Dynamically import and mock the appMode module
      const appMode = await import('../../config/appMode.js');
      const originalIsSchoolProduction = appMode.isSchoolProduction;

      // Override the exported value
      Object.defineProperty(appMode, 'isSchoolProduction', { value: true, writable: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Hacker',
          email: 'hacker@evil.com',
          password: 'password123',
        },
      });

      // Restore
      Object.defineProperty(appMode, 'isSchoolProduction', { value: originalIsSchoolProduction, writable: true });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('desabilitado');
    });

    it('should return 201 when APP_MODE=demo', async () => {
      const appMode = await import('../../config/appMode.js');
      const originalIsSchoolProduction = appMode.isSchoolProduction;

      Object.defineProperty(appMode, 'isSchoolProduction', { value: false, writable: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Demo User',
          email: 'demo@test.com',
          password: 'password123',
        },
      });

      Object.defineProperty(appMode, 'isSchoolProduction', { value: originalIsSchoolProduction, writable: true });

      expect(response.statusCode).toBe(201);
      expect(response.json().success).toBe(true);
    });
  });

  describe('POST /api/auth/login — administrador migration', () => {
    it('should migrate administrador to admin on login when school_production', async () => {
      const hashedPassword = await argon2.hash('password123');
      const user = await UserModel.create({
        name: 'Old Admin',
        email: 'oldadmin@test.com',
        password: hashedPassword,
        role: 'administrador',
        tenantId: 'tenant-migration-1',
      });

      const appMode = await import('../../config/appMode.js');
      const originalIsSchoolProduction = appMode.isSchoolProduction;
      Object.defineProperty(appMode, 'isSchoolProduction', { value: true, writable: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'oldadmin@test.com',
          password: 'password123',
        },
      });

      Object.defineProperty(appMode, 'isSchoolProduction', { value: originalIsSchoolProduction, writable: true });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.role).toBe('admin');

      // Verify database was updated
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser?.role).toBe('admin');
    });

    it('should NOT migrate administrador in demo mode', async () => {
      const hashedPassword = await argon2.hash('password123');
      const user = await UserModel.create({
        name: 'Old Admin Demo',
        email: 'oldadmin-demo@test.com',
        password: hashedPassword,
        role: 'administrador',
        tenantId: 'tenant-migration-2',
      });

      const appMode = await import('../../config/appMode.js');
      const originalIsSchoolProduction = appMode.isSchoolProduction;
      Object.defineProperty(appMode, 'isSchoolProduction', { value: false, writable: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'oldadmin-demo@test.com',
          password: 'password123',
        },
      });

      Object.defineProperty(appMode, 'isSchoolProduction', { value: originalIsSchoolProduction, writable: true });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.user.role).toBe('administrador');

      // Verify database was NOT updated
      const unchangedUser = await UserModel.findById(user._id);
      expect(unchangedUser?.role).toBe('administrador');
    });
  });

  describe('Operational roles — school_production', () => {
    it('admin can login and access /api/auth/users', async () => {
      const hashedPassword = await argon2.hash('password123');
      await UserModel.create({
        name: 'Admin Prod',
        email: 'admin-prod@test.com',
        password: hashedPassword,
        role: 'admin',
        tenantId: 'tenant-ops-1',
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin-prod@test.com', password: 'password123' },
      });

      const token = loginRes.json().data.token;

      const usersRes = await app.inject({
        method: 'GET',
        url: '/api/auth/users',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(usersRes.statusCode).toBe(200);
    });

    it('secretaria can login and access /api/auth/users', async () => {
      const hashedPassword = await argon2.hash('password123');
      await UserModel.create({
        name: 'Secretaria Prod',
        email: 'sec-prod@test.com',
        password: hashedPassword,
        role: 'secretaria',
        tenantId: 'tenant-ops-2',
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'sec-prod@test.com', password: 'password123' },
      });

      const token = loginRes.json().data.token;

      const usersRes = await app.inject({
        method: 'GET',
        url: '/api/auth/users',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(usersRes.statusCode).toBe(200);
    });

    it('professor can login but is denied /api/auth/users', async () => {
      const hashedPassword = await argon2.hash('password123');
      await UserModel.create({
        name: 'Prof Prod',
        email: 'prof-prod@test.com',
        password: hashedPassword,
        role: 'professor',
        tenantId: 'tenant-ops-3',
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'prof-prod@test.com', password: 'password123' },
      });

      const token = loginRes.json().data.token;

      const usersRes = await app.inject({
        method: 'GET',
        url: '/api/auth/users',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(usersRes.statusCode).toBe(403);
    });
  });
});
