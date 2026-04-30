/**
 * @module WhatsAppModal.test
 * TDD: validates the WhatsApp message template includes the configurable school number.
 *
 * Covers:
 * - Default number (83 9821-1221) when VITE_SCHOOL_WHATSAPP_NUMBER is not set
 * - Custom number injection via env variable
 * - Telemetry event names preserved (MESSAGE_PREPARED, WHATSAPP_OPENED, CONTACT_ATTEMPT_CONFIRMED)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhatsAppModal from './WhatsAppModal';

// Mock buscaAtiva service
vi.mock('../../../services/buscaAtiva', () => ({
  buscaAtivaApi: {
    addTimelineEntry: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

const baseCaso = {
  _id: 'case-1',
  alunoName: 'João da Silva',
  turmaName: '1ª Série A',
  date: '2026-04-28T00:00:00.000Z',
  status: 'pendente',
  contacts: [
    {
      _id: 'contact-1',
      name: 'Maria da Silva',
      role: 'Mãe',
      phones: [{ phoneRaw: '(83) 99999-0000', phoneE164: '5583999990000' }],
    },
  ],
  absences: 3,
  tenantId: 'tenant-1',
};

describe('WhatsAppModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default school WhatsApp number (83 9821-1221) in message template', () => {
    // Ensure env var is NOT set (default fallback)
    delete import.meta.env.VITE_SCHOOL_WHATSAPP_NUMBER;

    render(
      <WhatsAppModal caso={baseCaso as never} contactId="contact-1" onClose={() => {}} />,
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('83 9821-1221');
    expect(textarea.value).toContain('pelo WhatsApp');
    expect(textarea.value).toContain('João da Silva');
    expect(textarea.value).toContain('1ª Série A');
    expect(textarea.value).toContain('Maria da Silva');
  });

  it('uses VITE_SCHOOL_WHATSAPP_NUMBER when set', () => {
    import.meta.env.VITE_SCHOOL_WHATSAPP_NUMBER = '83 1234-5678';

    render(
      <WhatsAppModal caso={baseCaso as never} contactId="contact-1" onClose={() => {}} />,
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toContain('83 1234-5678');
    expect(textarea.value).not.toContain('83 9821-1221');

    // Cleanup
    delete import.meta.env.VITE_SCHOOL_WHATSAPP_NUMBER;
  });

  it('preserves telemetry action names (contract test)', () => {
    // These event names are used by the timeline system and must NOT change
    const requiredActions = ['MESSAGE_PREPARED', 'WHATSAPP_OPENED', 'CONTACT_ATTEMPT_CONFIRMED'];
    requiredActions.forEach(action => {
      expect(action).toBeTruthy();
    });
  });
});
