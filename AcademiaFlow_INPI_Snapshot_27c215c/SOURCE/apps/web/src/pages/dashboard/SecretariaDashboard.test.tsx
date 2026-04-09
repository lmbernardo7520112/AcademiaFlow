import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SecretariaDashboard from './SecretariaDashboard';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('SecretariaDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar kpis corretamente com o novo contrato da API {success, data}', async () => {
    const mockMetrics = {
      kpis: {
        totalAlunos: 100,
        ativos: 80,
        inativos: 20,
        evadidos: 5,
        occupancyRate: 80,
        overallAverage: 8.5,
        totalTurmas: 10,
        totalDisciplinas: 15,
      },
      recentActivity: [
        { _id: '1', value: 8.5, alunoId: { name: 'João' }, disciplinaId: { name: 'Matemática' } }
      ],
    };

    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: mockMetrics,
      },
    });

    render(<SecretariaDashboard />);

    // Verifica loading
    expect(screen.getByText(/Sincronizando Métricas/i)).toBeInTheDocument();

    // Aguarda a renderização dos dados
    await waitFor(() => {
      // Busca especificamente o card de Alunos Ativos e verifica o valor exato
      const ativosCard = screen.getByText('Alunos Ativos').closest('.kpi-card');
      expect(ativosCard).toBeTruthy();
      expect(ativosCard?.querySelector('.kpi-value')?.textContent).toBe('80');
      
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // Retenção (80/100)
      
      const mediaCard = screen.getByText('Média Geral').closest('.kpi-card');
      expect(mediaCard?.querySelector('.kpi-value')?.textContent).toBe('8.5');
    });

    expect(screen.getByText('João')).toBeInTheDocument();
    // A nota 8.5 aparece no KPI e na lista de atividade
    expect(screen.getAllByText('8.5').length).toBeGreaterThanOrEqual(2);
  });

  it('deve lidar com falha na API graciosamente', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: false,
      },
    });

    render(<SecretariaDashboard />);

    await waitFor(() => {
       expect(screen.getByText(/Erro ao carregar dados/i)).toBeInTheDocument();
    });
  });
});
