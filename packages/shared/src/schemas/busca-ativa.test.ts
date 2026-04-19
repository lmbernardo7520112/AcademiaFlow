import { describe, it, expect } from 'vitest';
import {
  caseStatusSchema,
  timelineActionSchema,
  contactChannelSchema,
  phoneResultSchema,
  parsedEntrySchema,
  parseWarningSchema,
  importAbsenceListSchema,
  addTimelineEntrySchema,
  updateCaseStatusSchema,
  correctContactSchema,
  hasManualWork,
  CASE_STATUS,
  TIMELINE_ACTION,
  MANUAL_TIMELINE_ACTIONS,
} from './busca-ativa.js';

describe('busca-ativa schemas', () => {
  describe('caseStatusSchema', () => {
    it('accepts valid status values', () => {
      expect(caseStatusSchema.parse('NOVO')).toBe('NOVO');
      expect(caseStatusSchema.parse('ENCERRADO')).toBe('ENCERRADO');
      expect(caseStatusSchema.parse('SUPERSEDED')).toBe('SUPERSEDED');
    });

    it('rejects invalid status', () => {
      expect(() => caseStatusSchema.parse('INVALID')).toThrow();
    });
  });

  describe('timelineActionSchema', () => {
    it('accepts all 10 valid actions', () => {
      const actions = Object.values(TIMELINE_ACTION);
      expect(actions).toHaveLength(10);
      for (const action of actions) {
        expect(timelineActionSchema.parse(action)).toBe(action);
      }
    });
  });

  describe('MANUAL_TIMELINE_ACTIONS', () => {
    it('has exactly 5 manual actions', () => {
      expect(MANUAL_TIMELINE_ACTIONS).toHaveLength(5);
    });

    it('includes action types that represent real human work', () => {
      expect(MANUAL_TIMELINE_ACTIONS).toContain('CONTACT_ATTEMPT_CONFIRMED');
      expect(MANUAL_TIMELINE_ACTIONS).toContain('RESPONSE_RECEIVED');
      expect(MANUAL_TIMELINE_ACTIONS).toContain('ATTACHMENT_UPLOADED');
      expect(MANUAL_TIMELINE_ACTIONS).toContain('CONTACT_CORRECTED');
      expect(MANUAL_TIMELINE_ACTIONS).toContain('CASE_RESOLVED');
    });

    it('excludes automatic/telemetry actions', () => {
      expect(MANUAL_TIMELINE_ACTIONS).not.toContain('CASE_CREATED');
      expect(MANUAL_TIMELINE_ACTIONS).not.toContain('STATUS_CHANGED');
      expect(MANUAL_TIMELINE_ACTIONS).not.toContain('MESSAGE_PREPARED');
      expect(MANUAL_TIMELINE_ACTIONS).not.toContain('WHATSAPP_OPENED');
      expect(MANUAL_TIMELINE_ACTIONS).not.toContain('IMPORT_SUPERSEDED');
    });
  });

  describe('phoneResultSchema', () => {
    it('accepts valid phone with E.164', () => {
      const result = phoneResultSchema.parse({
        phoneRaw: '47 99955-1961',
        phoneDigitsOnly: '47999551961',
        phoneE164: '5547999551961',
        phoneIssue: null,
      });
      expect(result.phoneE164).toBe('5547999551961');
    });

    it('accepts phone with missing area code', () => {
      const result = phoneResultSchema.parse({
        phoneRaw: '9 9825-9128',
        phoneDigitsOnly: '999259128',
        phoneE164: null,
        phoneIssue: 'missing_area_code',
      });
      expect(result.phoneE164).toBeNull();
      expect(result.phoneIssue).toBe('missing_area_code');
    });

    it('accepts incomplete phone', () => {
      const result = phoneResultSchema.parse({
        phoneRaw: '98713',
        phoneDigitsOnly: '98713',
        phoneE164: null,
        phoneIssue: 'incomplete_phone',
      });
      expect(result.phoneIssue).toBe('incomplete_phone');
    });
  });

  describe('importAbsenceListSchema', () => {
    it('accepts valid payload', () => {
      const result = importAbsenceListSchema.parse({
        rawText: 'BUSCA ATIVA – ALUNOS FALTOSOS\n17/04/2026\n1ª SÉRIE A',
        previewHash: 'abc123',
      });
      expect(result.rawText).toBeTruthy();
    });

    it('rejects empty rawText', () => {
      expect(() => importAbsenceListSchema.parse({ rawText: '' })).toThrow();
    });

    it('rejects rawText shorter than 10 chars', () => {
      expect(() => importAbsenceListSchema.parse({ rawText: 'short' })).toThrow();
    });

    it('accepts payload without previewHash', () => {
      const result = importAbsenceListSchema.parse({
        rawText: 'BUSCA ATIVA – ALUNOS FALTOSOS\n17/04/2026',
      });
      expect(result.previewHash).toBeUndefined();
    });
  });

  describe('addTimelineEntrySchema', () => {
    it('accepts MESSAGE_PREPARED entry', () => {
      const result = addTimelineEntrySchema.parse({
        action: 'MESSAGE_PREPARED',
        contactId: '507f1f77bcf86cd799439011',
        messageText: 'Olá, informamos que...',
      });
      expect(result.action).toBe('MESSAGE_PREPARED');
    });

    it('accepts CONTACT_ATTEMPT_CONFIRMED with outcome', () => {
      const result = addTimelineEntrySchema.parse({
        action: 'CONTACT_ATTEMPT_CONFIRMED',
        channel: 'whatsapp_manual',
        outcome: 'sent',
        notes: 'Mensagem recebida',
      });
      expect(result.outcome).toBe('sent');
    });
  });

  describe('updateCaseStatusSchema', () => {
    it('accepts valid status transition', () => {
      const result = updateCaseStatusSchema.parse({ status: 'CONTATO_INICIADO' });
      expect(result.status).toBe('CONTATO_INICIADO');
    });

    it('rejects invalid status', () => {
      expect(() => updateCaseStatusSchema.parse({ status: 'FAKE' })).toThrow();
    });
  });

  describe('correctContactSchema', () => {
    it('accepts corrected phone', () => {
      const result = correctContactSchema.parse({
        correctedPhone: {
          phoneRaw: '83 99925-9128',
          phoneDigitsOnly: '83999259128',
          phoneE164: '5583999259128',
          phoneIssue: null,
        },
      });
      expect(result.correctedPhone.phoneE164).toBe('5583999259128');
    });
  });

  describe('hasManualWork predicate', () => {
    it('returns false for empty timeline and no attachments', () => {
      expect(hasManualWork([], 0)).toBe(false);
    });

    it('returns false for timeline with only CASE_CREATED', () => {
      expect(hasManualWork([{ action: 'CASE_CREATED' }], 0)).toBe(false);
    });

    it('returns false for timeline with only automatic actions', () => {
      const timeline = [
        { action: 'CASE_CREATED' },
        { action: 'STATUS_CHANGED' },
        { action: 'MESSAGE_PREPARED' },
        { action: 'WHATSAPP_OPENED' },
      ];
      expect(hasManualWork(timeline, 0)).toBe(false);
    });

    it('returns true for timeline with CONTACT_ATTEMPT_CONFIRMED', () => {
      expect(hasManualWork([
        { action: 'CASE_CREATED' },
        { action: 'CONTACT_ATTEMPT_CONFIRMED' },
      ], 0)).toBe(true);
    });

    it('returns true for timeline with RESPONSE_RECEIVED', () => {
      expect(hasManualWork([{ action: 'RESPONSE_RECEIVED' }], 0)).toBe(true);
    });

    it('returns true for timeline with CONTACT_CORRECTED', () => {
      expect(hasManualWork([{ action: 'CONTACT_CORRECTED' }], 0)).toBe(true);
    });

    it('returns true for timeline with CASE_RESOLVED', () => {
      expect(hasManualWork([{ action: 'CASE_RESOLVED' }], 0)).toBe(true);
    });

    it('returns true for timeline with ATTACHMENT_UPLOADED', () => {
      expect(hasManualWork([{ action: 'ATTACHMENT_UPLOADED' }], 0)).toBe(true);
    });

    it('returns true when attachments exist even without manual timeline', () => {
      expect(hasManualWork([{ action: 'CASE_CREATED' }], 1)).toBe(true);
    });

    it('returns true when both manual timeline and attachments exist', () => {
      expect(hasManualWork([{ action: 'CONTACT_ATTEMPT_CONFIRMED' }], 2)).toBe(true);
    });
  });

  describe('parsedEntrySchema', () => {
    it('accepts a valid entry', () => {
      const entry = parsedEntrySchema.parse({
        rawBlock: '* Kalebe de Souza Gomes\nMãe: Magda (47 99955-1961)',
        turmaName: '1ª SÉRIE A',
        turmaId: null,
        alunoName: 'Kalebe de Souza Gomes',
        alunoId: null,
        contacts: [{
          role: 'Mãe',
          name: 'Magda',
          phones: [{
            phoneRaw: '47 99955-1961',
            phoneDigitsOnly: '47999551961',
            phoneE164: '5547999551961',
            phoneIssue: null,
          }],
        }],
        flags: {
          justified_in_source: false,
          possible_transfer: false,
          multiple_contacts: false,
          multiple_numbers: false,
        },
        observations: [],
      });
      expect(entry.alunoName).toBe('Kalebe de Souza Gomes');
    });
  });

  describe('parseWarningSchema', () => {
    it('accepts valid warning', () => {
      const w = parseWarningSchema.parse({
        type: 'missing_area_code',
        message: 'Telefone sem DDD',
        rawLine: '9 9825-9128',
      });
      expect(w.type).toBe('missing_area_code');
    });
  });

  describe('status enum completeness', () => {
    it('has all 11 required statuses', () => {
      const statuses = Object.values(CASE_STATUS);
      expect(statuses).toHaveLength(11);
      expect(statuses).toContain('SUPERSEDED');
    });
  });
});
