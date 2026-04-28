/**
 * @module siage.service
 * Frontend API service for SIAGE interoperability.
 * All calls go through the authenticated axios instance.
 */
import { api } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SiageRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'EXTRACTING'
  | 'MATCHING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export const SIAGE_STATUS_LABELS: Record<SiageRunStatus, string> = {
  QUEUED: 'Na fila',
  RUNNING: 'Processando',
  EXTRACTING: 'Extraindo dados',
  MATCHING: 'Conciliando',
  IMPORTING: 'Importando notas',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

export const SIAGE_STATUS_COLORS: Record<SiageRunStatus, string> = {
  QUEUED: '#888',
  RUNNING: '#f59e0b',
  EXTRACTING: '#f59e0b',
  MATCHING: '#3b82f6',
  IMPORTING: '#8b5cf6',
  COMPLETED: '#10b981',
  FAILED: '#ef4444',
  CANCELLED: '#6b7280',
};

export interface SiageRun {
  _id: string;
  tenantId: string;
  year: number;
  bimester: number;
  turmaFilter: string;
  status: SiageRunStatus;
  createdBy: string;
  stats: {
    total: number;
    matched: number;
    imported: number;
    notRegistered: number;
    errors: number;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type MatchStatus = 'AUTO_MATCHED' | 'MANUAL_PENDING' | 'UNMATCHED' | 'RESOLVED' | 'IMPORTED' | 'IMPORT_FAILED';

export interface SiageRunItem {
  _id: string;
  runId: string;
  source: {
    alunoName: string;
    matriculaSiage: string;
    disciplinaName: string;
    turmaName: string;
    bimester: number;
    value: number | null;
  };
  matchResult: {
    status: MatchStatus;
    alunoId?: string;
    disciplinaId?: string;
    turmaId?: string;
  };
  resolution?: {
    resolvedBy: string;
    resolvedAt: string;
    action: string;
    previousStatus: string;
  };
  importResult?: {
    status: string;
    notaId?: string;
    error?: string;
  };
}

export interface SiageAlias {
  _id: string;
  siageName: string;
  siageNameNormalized: string;
  disciplinaId: { _id: string; name: string } | null;
  tenantId: string;
}

// ─── API Calls ───────────────────────────────────────────────────────────────

export const siageApi = {
  // Runs
  createRun: (data: {
    year: number;
    bimester: number;
    turmaFilter?: string;
    credentials: { username: string; password: string };
  }) => api.post('/siage/runs', data),

  listRuns: () => api.get('/siage/runs'),

  getRun: (runId: string) => api.get(`/siage/runs/${runId}`),

  cancelRun: (runId: string) => api.post(`/siage/runs/${runId}/cancel`),

  // Items
  listItems: (runId: string, matchStatus?: string) =>
    api.get(`/siage/runs/${runId}/items`, { params: matchStatus ? { matchStatus } : {} }),

  resolveItem: (runId: string, itemId: string, data: { alunoId?: string; disciplinaId?: string }) =>
    api.post(`/siage/runs/${runId}/items/${itemId}/resolve`, data),

  // Aliases
  listAliases: () => api.get('/siage/aliases'),

  createAlias: (data: { siageName: string; disciplinaId: string }) =>
    api.post('/siage/aliases', data),

  autoCreateAliases: () =>
    api.post('/siage/aliases/auto-create'),

  // Import (human-triggered)
  importRun: (runId: string) => api.post(`/siage/runs/${runId}/import`),

  // Promote (explicit, auditable, UI-driven)
  promoteRun: (runId: string) => api.post(`/siage/runs/${runId}/promote`),

  getPromotionPreview: (runId: string) => api.get(`/siage/runs/${runId}/promote/preview`),

  // Pilot policy
  getPilotPolicy: () => api.get('/siage/pilot-policy'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isTerminalStatus(status: SiageRunStatus): boolean {
  return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status);
}

export function isProcessing(status: SiageRunStatus): boolean {
  return ['RUNNING', 'EXTRACTING', 'MATCHING', 'IMPORTING'].includes(status);
}
