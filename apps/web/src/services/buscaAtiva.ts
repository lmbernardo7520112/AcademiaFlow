/**
 * @module busca-ativa API service
 * Frontend API calls for the Busca Ativa feature.
 */
import { api } from './api';
import type { ParseResult, AddTimelineEntryPayload, PhoneResult } from '@academiaflow/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BuscaAtivaImport {
  _id: string;
  tenantId: string;
  date: string;
  version: number;
  stats: ParseResult['stats'];
  casesCreated: number;
  createdAt: string;
}

export interface BuscaAtivaCase {
  _id: string;
  tenantId: string;
  importId: string;
  date: string;
  alunoName: string;
  normalizedAlunoName: string;
  alunoId: string | null;
  turmaName: string;
  turmaId: string | null;
  contacts: Array<{
    _id: string;
    role: string;
    name: string;
    phones: PhoneResult[];
    hasValidPhone: boolean;
    correctedPhone: PhoneResult | null;
  }>;
  flags: {
    justified_in_source: boolean;
    possible_transfer: boolean;
    unmatched_aluno: boolean;
    ambiguous_aluno: boolean;
  };
  observations: string[];
  status: string;
  timeline: Array<{
    _id: string;
    action: string;
    channel?: string;
    contactId?: string;
    phoneUsed?: string;
    messageText?: string;
    waUrl?: string;
    previousStatus?: string;
    newStatus?: string;
    outcome?: string;
    responseText?: string;
    notes?: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    createdBy?: string;
    createdAt: string;
  }>;
  attachments: Array<{
    _id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>;
  createdAt: string;
}

// ─── API Calls ───────────────────────────────────────────────────────────────

export const buscaAtivaApi = {
  async importList(rawText: string, previewHash?: string) {
    const { data } = await api.post('/busca-ativa/import', { rawText, previewHash });
    return data;
  },

  async replaceImport(importId: string, rawText: string) {
    const { data } = await api.put(`/busca-ativa/imports/${importId}/replace`, { rawText });
    return data;
  },

  async listImports(dateFrom?: string, dateTo?: string) {
    const { data } = await api.get('/busca-ativa/imports', { params: { dateFrom, dateTo } });
    return data;
  },

  async listCases(filters?: { date?: string; status?: string; turmaName?: string }) {
    const { data } = await api.get('/busca-ativa/cases', { params: filters });
    return data;
  },

  async getCaseById(caseId: string) {
    const { data } = await api.get(`/busca-ativa/cases/${caseId}`);
    return data;
  },

  async updateCaseStatus(caseId: string, status: string) {
    const { data } = await api.patch(`/busca-ativa/cases/${caseId}/status`, { status });
    return data;
  },

  async correctContact(caseId: string, contactId: string, correctedPhone: PhoneResult) {
    const { data } = await api.patch(
      `/busca-ativa/cases/${caseId}/contacts/${contactId}`,
      { correctedPhone },
    );
    return data;
  },

  async addTimelineEntry(caseId: string, entry: AddTimelineEntryPayload) {
    const { data } = await api.post(`/busca-ativa/cases/${caseId}/timeline`, entry);
    return data;
  },

  async getDossie(alunoId: string) {
    const { data } = await api.get(`/busca-ativa/dossie/${alunoId}`);
    return data;
  },
};
