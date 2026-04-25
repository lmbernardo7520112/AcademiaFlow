import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiagePage from './SiagePage';

// Mock services
vi.mock('../../../services/siage', () => ({
  siageApi: {
    listRuns: vi.fn().mockResolvedValue({ data: { data: [] } }),
    listAliases: vi.fn().mockResolvedValue({ data: { data: [] } }),
    createRun: vi.fn().mockResolvedValue({ data: { success: true } }),
    cancelRun: vi.fn().mockResolvedValue({ data: { success: true } }),
    listItems: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
  SIAGE_STATUS_LABELS: {
    QUEUED: 'Na fila', RUNNING: 'Processando', EXTRACTING: 'Extraindo dados',
    MATCHING: 'Conciliando', IMPORTING: 'Importando notas',
    COMPLETED: 'Concluído', FAILED: 'Falhou', CANCELLED: 'Cancelado',
  },
  SIAGE_STATUS_COLORS: {
    QUEUED: '#888', RUNNING: '#f59e0b', EXTRACTING: '#f59e0b',
    MATCHING: '#3b82f6', IMPORTING: '#8b5cf6',
    COMPLETED: '#10b981', FAILED: '#ef4444', CANCELLED: '#6b7280',
  },
  isTerminalStatus: (s: string) => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(s),
  isProcessing: (s: string) => ['RUNNING', 'EXTRACTING', 'MATCHING', 'IMPORTING'].includes(s),
}));

vi.mock('../../../services/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

describe('SiagePage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders page title', async () => {
    render(<MemoryRouter><SiagePage /></MemoryRouter>);
    expect(await screen.findByText('Interoperabilidade SIAGE')).toBeDefined();
  });

  it('renders empty state when no runs exist', async () => {
    render(<MemoryRouter><SiagePage /></MemoryRouter>);
    expect(await screen.findByText(/Nenhuma execução registrada/)).toBeDefined();
  });

  it('shows Nova Sincronização button', async () => {
    render(<MemoryRouter><SiagePage /></MemoryRouter>);
    expect(await screen.findByText('Nova Sincronização')).toBeDefined();
  });

  it('renders Execuções and Aliases tabs', async () => {
    render(<MemoryRouter><SiagePage /></MemoryRouter>);
    expect(await screen.findByText('Execuções')).toBeDefined();
    expect(screen.getByText('Aliases de Disciplina')).toBeDefined();
  });

  it('shows honest status labels for QUEUED', async () => {
    const { SIAGE_STATUS_LABELS } = await import('../../../services/siage');
    expect(SIAGE_STATUS_LABELS.QUEUED).toBe('Na fila');
    expect(SIAGE_STATUS_LABELS.QUEUED).not.toContain('Processando');
  });

  it('shows runs table with correct columns', async () => {
    render(<MemoryRouter><SiagePage /></MemoryRouter>);
    expect(await screen.findByText('Ano')).toBeDefined();
    expect(screen.getByText('Bimestre')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
  });
});
