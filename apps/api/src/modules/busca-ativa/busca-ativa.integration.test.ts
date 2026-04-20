/**
 * @module busca-ativa.integration.test
 * Integration tests for all Busca Ativa operational flows.
 * Each test is self-contained due to global afterEach collection cleanup.
 *
 * Covers: import, replace, updateStatus (state machine), addTimeline,
 *         correctContact, listCases, dossiê.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createTestUser } from '../../test-helpers.js';
import mongoose from 'mongoose';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

let _dateCounter = 1;
function nextDate(): string {
  const d = _dateCounter++;
  const day = String(d % 28 + 1).padStart(2, '0');
  const month = String(Math.floor(d / 28) % 12 + 1).padStart(2, '0');
  return `${day}/${month}/2026`;
}

function makeRawText(dateStr: string): string {
  return `BUSCA ATIVA – ALUNOS FALTOSOS
📅 ${dateStr}

━━━━━━━━━━━━━━━
1ª SÉRIE A
* João Teste da Silva
Mãe: Ana (83 99955-1961)

* Maria Teste Souza
Pai: Carlos (47 99609-3204)

━━━━━━━━━━━━━━━
2ª SÉRIE B
* Pedro Teste Lima
Resp.: Luísa (83 98816-8206)`;
}

const API = '/api/busca-ativa';
function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
function jsonAuth(token: string) {
  return { ...auth(token), 'content-type': 'application/json' };
}

/** Creates an import and returns { importId, date } */
async function createImport(app: FastifyInstance, token: string, dateStr?: string) {
  const d = dateStr || nextDate();
  const res = await app.inject({
    method: 'POST',
    url: `${API}/import`,
    headers: jsonAuth(token),
    payload: { rawText: makeRawText(d) },
  });
  return { res, date: d, importId: res.json().importId as string };
}

// ─── Main Suite (single app instance) ────────────────────────────────────────

describe('Busca Ativa Integration Suite', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    if (mongoose.connection.readyState !== 1) {
      await new Promise(r => mongoose.connection.once('connected', r));
    }
    const user = await createTestUser(app, { role: 'secretaria' });
    token = user.token;
  }, 15000);

  afterAll(async () => {
    if (app) await app.close();
  }, 15000);

  // ─── Import ──────────────────────────────────────────────────────────────────

  describe('Import', () => {
    it('POST 201 — creates import and cases', async () => {
      const { res } = await createImport(app, token);
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.casesCreated).toBe(3);
      expect(body.importId).toBeTruthy();
    });

    it('POST 409 — rejects duplicate date', async () => {
      const date = nextDate();
      const first = await createImport(app, token, date);
      expect(first.res.statusCode).toBe(201);

      const second = await createImport(app, token, date);
      expect(second.res.statusCode).toBe(409);
      expect(second.res.json().message).toContain('já existe');
    });

    it('POST 400 — rejects listing without date', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `${API}/import`,
        headers: jsonAuth(token),
        payload: { rawText: '1ª SÉRIE A\n* Fulano\nMãe: Ana (83 91234-5678)' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── Replace ─────────────────────────────────────────────────────────────────

  describe('Replace', () => {
    it('PUT 200 — replaces import without manual work', async () => {
      const date = nextDate();
      const { importId } = await createImport(app, token, date);

      const res = await app.inject({
        method: 'PUT',
        url: `${API}/imports/${importId}/replace`,
        headers: jsonAuth(token),
        payload: { rawText: makeRawText(date) },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.casesArchived).toBe(3);
      expect(body.casesCreated).toBe(3);
      expect(body.importVersion).toBe(2);
    });

    it('PUT 422 — blocks replace when manual work exists', async () => {
      const date = nextDate();
      const { importId } = await createImport(app, token, date);

      // Get cases and add manual work
      const casesRes = await app.inject({
        method: 'GET',
        url: `${API}/cases`,
        headers: auth(token),
      });
      const cases = casesRes.json().data;
      const targetCase = cases.find((c: { status: string }) => c.status === 'NOVO');
      expect(targetCase).toBeDefined();

      await app.inject({
        method: 'POST',
        url: `${API}/cases/${targetCase._id}/timeline`,
        headers: jsonAuth(token),
        payload: {
          action: 'CONTACT_ATTEMPT_CONFIRMED',
          channel: 'whatsapp_manual',
          outcome: 'sent',
        },
      });

      const replaceRes = await app.inject({
        method: 'PUT',
        url: `${API}/imports/${importId}/replace`,
        headers: jsonAuth(token),
        payload: { rawText: makeRawText(date) },
      });
      expect(replaceRes.statusCode).toBe(422);
      expect(replaceRes.json().blockedReason).toBe('MANUAL_WORK_EXISTS');
    });

    it('PUT 404 — non-existent import', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'PUT',
        url: `${API}/imports/${fakeId}/replace`,
        headers: jsonAuth(token),
        payload: { rawText: makeRawText('01/01/2030') },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── List Imports ────────────────────────────────────────────────────────────

  describe('List Imports', () => {
    it('GET 200 — returns import list', async () => {
      await createImport(app, token);
      await createImport(app, token);

      const res = await app.inject({
        method: 'GET',
        url: `${API}/imports`,
        headers: auth(token),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Status Transitions (State Machine) ──────────────────────────────────────

  describe('Status Transitions', () => {
    it('PATCH 200 — valid NOVO → PENDENTE → ENCERRADO chain', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      // NOVO → PENDENTE
      const r1 = await app.inject({
        method: 'PATCH',
        url: `${API}/cases/${caseId}/status`,
        headers: jsonAuth(token),
        payload: { status: 'PENDENTE' },
      });
      expect(r1.statusCode).toBe(200);
      expect(r1.json().data.status).toBe('PENDENTE');

      // PENDENTE → ENCERRADO
      const r2 = await app.inject({
        method: 'PATCH',
        url: `${API}/cases/${caseId}/status`,
        headers: jsonAuth(token),
        payload: { status: 'ENCERRADO' },
      });
      expect(r2.statusCode).toBe(200);
      expect(r2.json().data.status).toBe('ENCERRADO');
    });

    it('PATCH 400 — invalid ENCERRADO → NOVO (terminal)', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      // Move to ENCERRADO via PENDENTE
      await app.inject({
        method: 'PATCH', url: `${API}/cases/${caseId}/status`,
        headers: jsonAuth(token), payload: { status: 'PENDENTE' },
      });
      await app.inject({
        method: 'PATCH', url: `${API}/cases/${caseId}/status`,
        headers: jsonAuth(token), payload: { status: 'ENCERRADO' },
      });

      // ENCERRADO → NOVO should be rejected
      const res = await app.inject({
        method: 'PATCH',
        url: `${API}/cases/${caseId}/status`,
        headers: jsonAuth(token),
        payload: { status: 'NOVO' },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().message).toContain('terminal');
    });

    it('PATCH 400 — invalid NOVO → ENCERRADO (not allowed)', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      const res = await app.inject({
        method: 'PATCH',
        url: `${API}/cases/${caseId}/status`,
        headers: jsonAuth(token),
        payload: { status: 'ENCERRADO' },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().message).toContain('não é permitida');
    });

    it('PATCH 404 — non-existent case', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'PATCH',
        url: `${API}/cases/${fakeId}/status`,
        headers: jsonAuth(token),
        payload: { status: 'PENDENTE' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('GET 200 — case detail', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      const res = await app.inject({
        method: 'GET',
        url: `${API}/cases/${caseId}`,
        headers: auth(token),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data._id).toBe(caseId);
    });
  });

  // ─── Timeline + Auto-Transition ──────────────────────────────────────────────

  describe('Timeline & Auto-Transition', () => {
    it('POST 201 — WHATSAPP_OPENED telemetry entry', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      const res = await app.inject({
        method: 'POST',
        url: `${API}/cases/${caseId}/timeline`,
        headers: jsonAuth(token),
        payload: {
          action: 'WHATSAPP_OPENED',
          channel: 'whatsapp_manual',
          phoneUsed: '5583999551961',
          messageText: 'Olá, tudo bem?',
          waUrl: 'https://wa.me/5583999551961',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.timeline.at(-1).action).toBe('WHATSAPP_OPENED');
    });

    it('POST 201 — CONTACT_ATTEMPT_CONFIRMED auto-transitions NOVO → CONTATO_INICIADO', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      const res = await app.inject({
        method: 'POST',
        url: `${API}/cases/${caseId}/timeline`,
        headers: jsonAuth(token),
        payload: {
          action: 'CONTACT_ATTEMPT_CONFIRMED',
          channel: 'whatsapp_manual',
          outcome: 'sent',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.status).toBe('CONTATO_INICIADO');

      const statusChange = res.json().data.timeline.find(
        (e: { action: string; newStatus?: string }) =>
          e.action === 'STATUS_CHANGED' && e.newStatus === 'CONTATO_INICIADO',
      );
      expect(statusChange).toBeDefined();
    });

    it('POST 201 — cancelled CONTACT_ATTEMPT does NOT auto-transition', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      const res = await app.inject({
        method: 'POST',
        url: `${API}/cases/${caseId}/timeline`,
        headers: jsonAuth(token),
        payload: {
          action: 'CONTACT_ATTEMPT_CONFIRMED',
          channel: 'whatsapp_manual',
          outcome: 'cancelled',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.status).toBe('NOVO');
    });

    it('POST 201 — RESPONSE_RECEIVED appends entry', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;

      const res = await app.inject({
        method: 'POST',
        url: `${API}/cases/${caseId}/timeline`,
        headers: jsonAuth(token),
        payload: {
          action: 'RESPONSE_RECEIVED',
          responseText: 'Meu filho vai voltar amanhã',
          resolutionType: 'justified',
          justification: 'Doença na família',
        },
      });
      expect(res.statusCode).toBe(201);
      const responseEntry = res.json().data.timeline.find(
        (e: { action: string }) => e.action === 'RESPONSE_RECEIVED',
      );
      expect(responseEntry).toBeDefined();
      expect(responseEntry.responseText).toBe('Meu filho vai voltar amanhã');
    });

    it('POST 404 — non-existent case', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'POST',
        url: `${API}/cases/${fakeId}/timeline`,
        headers: jsonAuth(token),
        payload: { action: 'WHATSAPP_OPENED', channel: 'whatsapp_manual' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── List Cases & Dossiê ───────────────────────────────────────────────────

  describe('List Cases & Dossiê', () => {
    it('GET /cases — excludes SUPERSEDED', async () => {
      await createImport(app, token);
      // The import creates cases with NOVO status.
      // We don't create SUPERSEDED via API here; tested implicitly via replace.
      const res = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      expect(res.statusCode).toBe(200);
      for (const c of res.json().data) {
        expect(c.status).not.toBe('SUPERSEDED');
      }
    });

    it('GET /cases — filters by status NOVO', async () => {
      await createImport(app, token);
      const res = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
        query: { status: 'NOVO' },
      });
      expect(res.statusCode).toBe(200);
      for (const c of res.json().data) {
        expect(c.status).toBe('NOVO');
      }
    });

    it('GET /cases — filters by turma', async () => {
      await createImport(app, token);
      const res = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
        query: { turmaName: '1ª SÉRIE' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
      for (const c of res.json().data) {
        expect(c.turmaName).toMatch(/1ª SÉRIE/);
      }
    });

    it('PUT replace creates SUPERSEDED cases excluded from list', async () => {
      const date = nextDate();
      const { importId } = await createImport(app, token, date);

      // Replace — archives old cases as SUPERSEDED, creates new
      await app.inject({
        method: 'PUT',
        url: `${API}/imports/${importId}/replace`,
        headers: jsonAuth(token),
        payload: { rawText: makeRawText(date) },
      });

      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      for (const c of casesRes.json().data) {
        expect(c.status).not.toBe('SUPERSEDED');
      }
    });
  });

  // ─── CorrectContact ────────────────────────────────────────────────────────

  describe('CorrectContact', () => {
    it('PATCH 200 — corrects phone and adds timeline entry', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caso = casesRes.json().data.find(
        (c: { contacts: { hasValidPhone: boolean }[] }) => c.contacts.some(co => co.hasValidPhone),
      );
      expect(caso).toBeDefined();
      const contactId = caso.contacts[0]._id;

      const res = await app.inject({
        method: 'PATCH',
        url: `${API}/cases/${caso._id}/contacts/${contactId}`,
        headers: jsonAuth(token),
        payload: {
          correctedPhone: {
            phoneRaw: '83 98888-7777',
            phoneDigitsOnly: '83988887777',
            phoneE164: '5583988887777',
            phoneIssue: null,
          },
        },
      });
      expect(res.statusCode).toBe(200);

      // Verify via case detail
      const detailRes = await app.inject({
        method: 'GET', url: `${API}/cases/${caso._id}`, headers: auth(token),
      });
      const updated = detailRes.json().data;
      const corrected = updated.contacts.find((c: { _id: string }) => c._id === contactId);
      expect(corrected.correctedPhone.phoneE164).toBe('5583988887777');
      const correction = updated.timeline.find(
        (e: { action: string }) => e.action === 'CONTACT_CORRECTED',
      );
      expect(correction).toBeDefined();
    });

    it('PATCH 404 — wrong contact id', async () => {
      await createImport(app, token);
      const casesRes = await app.inject({
        method: 'GET', url: `${API}/cases`, headers: auth(token),
      });
      const caseId = casesRes.json().data[0]._id;
      const fakeContactId = new mongoose.Types.ObjectId().toString();

      const res = await app.inject({
        method: 'PATCH',
        url: `${API}/cases/${caseId}/contacts/${fakeContactId}`,
        headers: jsonAuth(token),
        payload: {
          correctedPhone: {
            phoneRaw: '83 91111-2222',
            phoneDigitsOnly: '83911112222',
            phoneE164: '5583911112222',
            phoneIssue: null,
          },
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
