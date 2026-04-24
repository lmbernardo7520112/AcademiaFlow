import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createTestUser } from '../../test-helpers.js';

/**
 * SIAGE Integration Tests
 *
 * Note: The global test setup (setup.ts) clears ALL collections afterEach.
 * Therefore, each `it()` block MUST create its own test data.
 */
describe('SIAGE Module Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }
    mongoose.set('bufferCommands', false);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Helper: create full test scenario (user + turma + disciplina + aluno + alias) ──
  async function setupFullScenario() {
    const ts = Date.now();
    const tenantId = new mongoose.Types.ObjectId().toString();

    const adminUser = await createTestUser(app, { role: 'secretaria', tenantId });

    const turmaRes = await app.inject({
      method: 'POST', url: '/api/turmas',
      headers: { Authorization: `Bearer ${adminUser.token}` },
      payload: { name: `Turma SIAGE ${ts}`, year: 2026, periodo: 'matutino' },
    });
    const turmaId = turmaRes.json().data._id;

    const discRes = await app.inject({
      method: 'POST', url: '/api/disciplinas',
      headers: { Authorization: `Bearer ${adminUser.token}` },
      payload: { name: `Biologia ${ts}`, codigo: `BIO-${Math.floor(Math.random() * 900) + 100}` },
    });
    const disciplinaId = discRes.json().data._id;

    const alunoRes = await app.inject({
      method: 'POST', url: '/api/alunos',
      headers: { Authorization: `Bearer ${adminUser.token}` },
      payload: {
        name: 'ALUNO CURSANDO COM NOTA',
        matricula: `MAT-SIAGE-${ts}`,
        turmaId,
        dataNascimento: '2008-03-15',
      },
    });
    const alunoId = alunoRes.json().data._id;

    return { adminUser, turmaId, disciplinaId, alunoId, tenantId };
  }

  // ─── Runs ──────────────────────────────────────────────────────────────────

  describe('Run lifecycle', () => {
    it('creates a run (secretaria)', async () => {
      const { adminUser } = await setupFullScenario();

      const res = await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { year: 2026, bimester: 1 },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('QUEUED');
      expect(body.data.year).toBe(2026);
    });

    it('rejects duplicate in-progress run (409)', async () => {
      const { adminUser } = await setupFullScenario();

      const first = await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { year: 2026, bimester: 1 },
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { year: 2026, bimester: 1 },
      });
      expect(second.statusCode).toBe(409);
    });

    it('rejects professor access (403)', async () => {
      const tenantId = new mongoose.Types.ObjectId().toString();
      const professor = await createTestUser(app, { role: 'professor', tenantId });

      const res = await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${professor.token}` },
        payload: { year: 2026, bimester: 2 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('lists runs for tenant', async () => {
      const { adminUser } = await setupFullScenario();

      await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { year: 2026, bimester: 1 },
      });

      const res = await app.inject({
        method: 'GET', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    });

    it('cancels a queued run', async () => {
      const { adminUser } = await setupFullScenario();

      const createRes = await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { year: 2026, bimester: 3 },
      });
      const runId = createRes.json().data._id;

      const cancelRes = await app.inject({
        method: 'POST', url: `/api/siage/runs/${runId}/cancel`,
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(cancelRes.statusCode).toBe(200);
      expect(cancelRes.json().data.status).toBe('CANCELLED');
    });
  });

  // ─── Aliases ───────────────────────────────────────────────────────────────

  describe('Alias management', () => {
    it('creates a discipline alias', async () => {
      const { adminUser, disciplinaId } = await setupFullScenario();

      const res = await app.inject({
        method: 'POST', url: '/api/siage/aliases',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { siageName: 'Biologia', disciplinaId },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.siageName).toBe('Biologia');
    });

    it('lists aliases', async () => {
      const { adminUser, disciplinaId } = await setupFullScenario();

      await app.inject({
        method: 'POST', url: '/api/siage/aliases',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { siageName: 'Biologia', disciplinaId },
      });

      const res = await app.inject({
        method: 'GET', url: '/api/siage/aliases',
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Ingest + Match + Import ───────────────────────────────────────────────

  describe('Ingest and Import Flow', () => {
    it('ingests items, matches by normalized name, imports grades', async () => {
      const { adminUser, disciplinaId } = await setupFullScenario();

      // Create alias for matching
      await app.inject({
        method: 'POST', url: '/api/siage/aliases',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { siageName: 'Biologia', disciplinaId },
      });

      // Create run
      const runRes = await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { year: 2026, bimester: 2 },
      });
      expect(runRes.statusCode).toBe(201);
      const runId = runRes.json().data._id;

      // Ingest items
      const ingestRes = await app.inject({
        method: 'POST', url: `/api/siage/runs/${runId}/ingest`,
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: {
          items: [
            {
              alunoName: 'ALUNO CURSANDO COM NOTA',
              matriculaSiage: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              disciplinaName: 'Biologia',
              turmaName: 'Ensino Médio - 1ª Série A',
              bimester: 2,
              value: 7.5,
            },
            {
              alunoName: 'ALUNO DESCONHECIDO',
              matriculaSiage: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',
              disciplinaName: 'Biologia',
              turmaName: 'Ensino Médio - 1ª Série A',
              bimester: 2,
              value: 5.0,
            },
          ],
        },
      });
      expect(ingestRes.statusCode).toBe(200);
      const ingestData = ingestRes.json().data;
      expect(ingestData.total).toBe(2);
      expect(ingestData.matched).toBe(1); // "ALUNO CURSANDO COM NOTA" matched
      expect(ingestData.unmatched).toBe(1); // "ALUNO DESCONHECIDO" not found

      // List matched items
      const itemsRes = await app.inject({
        method: 'GET',
        url: `/api/siage/runs/${runId}/items?matchStatus=AUTO_MATCHED`,
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(itemsRes.statusCode).toBe(200);
      expect(itemsRes.json().data.length).toBe(1);

      // Import matched items
      const importRes = await app.inject({
        method: 'POST', url: `/api/siage/runs/${runId}/import`,
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(importRes.statusCode).toBe(200);
      expect(importRes.json().data.imported).toBe(1);

      // Second import is idempotent
      const import2Res = await app.inject({
        method: 'POST', url: `/api/siage/runs/${runId}/import`,
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(import2Res.statusCode).toBe(200);
      expect(import2Res.json().data.imported).toBe(0);
    });

    it('marks item as MANUAL_PENDING when discipline alias is missing', async () => {
      const { adminUser } = await setupFullScenario();
      // NO alias created — discipline match will fail

      const runRes = await app.inject({
        method: 'POST', url: '/api/siage/runs',
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: { year: 2026, bimester: 1 },
      });
      const runId = runRes.json().data._id;

      const ingestRes = await app.inject({
        method: 'POST', url: `/api/siage/runs/${runId}/ingest`,
        headers: { Authorization: `Bearer ${adminUser.token}` },
        payload: {
          items: [{
            alunoName: 'ALUNO CURSANDO COM NOTA',
            matriculaSiage: 'test-uuid',
            disciplinaName: 'Matéria Sem Alias',
            turmaName: 'Turma X',
            bimester: 1,
            value: 8.0,
          }],
        },
      });
      expect(ingestRes.statusCode).toBe(200);
      // Aluno found but discipline not matched → MANUAL_PENDING
      expect(ingestRes.json().data.pending).toBe(1);
    });
  });
});
