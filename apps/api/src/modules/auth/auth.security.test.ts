import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';
import { UserModel } from '../../models/User.js';
import { TurmaModel } from '../../models/Turma.js';
import { DisciplinaModel } from '../../models/Disciplina.js';
import { NotaModel } from '../../models/Nota.js';
import { AlunoModel } from '../../models/Aluno.js';
import argon2 from 'argon2';

/**
 * Security Test Suite — v1.2.0
 * Tests IDOR protection, rate limiting, Helmet headers, and route authorization.
 * Written following TDD RED phase: these tests define the security contracts
 * BEFORE the implementation exists.
 */
describe('Security Hardening v1.2.0', () => {
  let app: FastifyInstance;
  const TENANT_A = 'tenant-security-a';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      TurmaModel.deleteMany({}),
      DisciplinaModel.deleteMany({}),
      NotaModel.deleteMany({}),
      AlunoModel.deleteMany({}),
    ]);
  });

  // ============================================================
  // 1. /register Route Protection
  // ============================================================

  describe('POST /api/auth/register — Authorization', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Unauthorized User',
          email: 'unauth@test.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when professor token is used', async () => {
      const prof = await UserModel.create({
        name: 'Prof Test',
        email: 'prof@test.com',
        password: await argon2.hash('password123'),
        role: 'professor',
        tenantId: TENANT_A,
      });

      const token = await app.jwt.sign({
        id: String(prof._id),
        role: prof.role,
        tenantId: prof.tenantId,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        headers: { Authorization: `Bearer ${token}` },
        payload: {
          name: 'New User',
          email: 'new@test.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should succeed when admin token is used', async () => {
      const admin = await UserModel.create({
        name: 'Admin Test',
        email: 'admin@test.com',
        password: await argon2.hash('password123'),
        role: 'admin',
        tenantId: TENANT_A,
      });

      const token = await app.jwt.sign({
        id: String(admin._id),
        role: admin.role,
        tenantId: admin.tenantId,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        headers: { Authorization: `Bearer ${token}` },
        payload: {
          name: 'New User',
          email: 'new@test.com',
          password: 'password123',
        },
      });

      // Should be 201 (created) — admin can register users
      expect(response.statusCode).toBe(201);
    });
  });

  // ============================================================
  // 2. IDOR Protection — Turmas
  // ============================================================

  describe('GET /api/turmas/:id — IDOR Protection', () => {
    it('should return 403 when professor accesses turma where they do not teach', async () => {
      // Create a professor in tenant A
      const prof = await UserModel.create({
        name: 'Prof Isolated',
        email: 'isolated@test.com',
        password: await argon2.hash('password123'),
        role: 'professor',
        tenantId: TENANT_A,
      });

      // Create a turma in tenant A
      const turma = await TurmaModel.create({
        name: '1º ANO A',
        year: 2026,
        periodo: 'vespertino',
        isActive: true,
        tenantId: TENANT_A,
      });

      // Create a discipline linked to a DIFFERENT professor
      const otherProf = await UserModel.create({
        name: 'Prof Other',
        email: 'other@test.com',
        password: await argon2.hash('password123'),
        role: 'professor',
        tenantId: TENANT_A,
      });

      await DisciplinaModel.create({
        name: 'Matemática',
        codigo: 'MAT-001',
        professorId: otherProf._id,
        turmaIds: [turma._id],
        tenantId: TENANT_A,
      });

      const token = await app.jwt.sign({
        id: String(prof._id),
        role: prof.role,
        tenantId: prof.tenantId,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/turmas/${turma._id}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      // Professor has no disciplines in this turma → 403
      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================
  // 3. IDOR Protection — Notas
  // ============================================================

  describe('DELETE /api/notas/:id — IDOR Protection', () => {
    it('should return 403 when professor deletes a nota from another professors discipline', async () => {
      // Professor A
      const profA = await UserModel.create({
        name: 'Prof A',
        email: 'profa@test.com',
        password: await argon2.hash('password123'),
        role: 'professor',
        tenantId: TENANT_A,
      });

      // Professor B (the owner)
      const profB = await UserModel.create({
        name: 'Prof B',
        email: 'profb@test.com',
        password: await argon2.hash('password123'),
        role: 'professor',
        tenantId: TENANT_A,
      });

      const turma = await TurmaModel.create({
        name: '2º ANO A',
        year: 2026,
        periodo: 'vespertino',
        isActive: true,
        tenantId: TENANT_A,
      });

      // Discipline belongs to Prof B
      const disciplina = await DisciplinaModel.create({
        name: 'Física',
        codigo: 'FIS-001',
        professorId: profB._id,
        turmaIds: [turma._id],
        tenantId: TENANT_A,
      });

      const aluno = await AlunoModel.create({
        name: 'Aluno Test',
        email: '01@escola.demo.br',
        matricula: '2ANOA-01',
        turmaId: turma._id,
        dataNascimento: new Date('2008-05-15'),
        tenantId: TENANT_A,
      });

      // Nota belongs to Prof B's discipline
      const nota = await NotaModel.create({
        alunoId: aluno._id,
        disciplinaId: disciplina._id,
        turmaId: turma._id,
        year: 2026,
        bimester: 1,
        value: 8.5,
        tenantId: TENANT_A,
      });

      // Prof A tries to delete Prof B's nota
      const tokenA = await app.jwt.sign({
        id: String(profA._id),
        role: profA.role,
        tenantId: profA.tenantId,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/notas/${nota._id}`,
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      // Prof A has no ownership over this nota → 403
      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================
  // 4. Rate Limiting
  // ============================================================

  describe('POST /api/auth/login — Rate Limiting', () => {
    it('should return 429 after exceeding login rate limit', async () => {
      // Create a user to attempt login
      await UserModel.create({
        name: 'Rate Limit User',
        email: 'rate@test.com',
        password: await argon2.hash('password123'),
        role: 'admin',
        tenantId: TENANT_A,
      });

      const loginPayload = { email: 'rate@test.com', password: 'wrong' };

      // Send 6 login attempts (limit is 5/min)
      const results = [];
      for (let i = 0; i < 6; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: loginPayload,
        });
        results.push(response.statusCode);
      }

      // The 6th request should be rate-limited
      expect(results[5]).toBe(429);
    });
  });

  // ============================================================
  // 5. Helmet Headers
  // ============================================================

  describe('Security Headers (Helmet)', () => {
    it('should include X-Content-Type-Options header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/ping',
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should NOT include X-Powered-By header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/ping',
      });

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ============================================================
  // 6. PUT /turmas/:id — Role Guard
  // ============================================================

  describe('PUT /api/turmas/:id — Role Guard', () => {
    it('should return 403 when professor tries to update turma', async () => {
      const prof = await UserModel.create({
        name: 'Prof Update',
        email: 'profup@test.com',
        password: await argon2.hash('password123'),
        role: 'professor',
        tenantId: TENANT_A,
      });

      const turma = await TurmaModel.create({
        name: '1º ANO B',
        year: 2026,
        periodo: 'vespertino',
        isActive: true,
        tenantId: TENANT_A,
      });

      const token = await app.jwt.sign({
        id: String(prof._id),
        role: prof.role,
        tenantId: prof.tenantId,
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/turmas/${turma._id}`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { name: 'Hacked Turma Name' },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
