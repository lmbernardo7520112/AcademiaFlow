import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import ProfessorAIPage from './ProfessorAI';
import { api } from '../../services/api';
import { AuthProvider } from '../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ProfessorAI Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('should load turmas on mount', async () => {
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ _id: 'turma-1', name: 'Turma A' }]
      }
    });

    renderWithProviders(<ProfessorAIPage />);

    await waitFor(() => {
      expect(screen.getByText('Turma A')).toBeInTheDocument();
    });
  });

  it('should call generate-activity when button is clicked', async () => {
    // Mock sequential loads
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: [{ _id: 't1', name: 'Turma A' }] } }) // Turmas
      .mockResolvedValueOnce({ data: { success: true, data: [{ _id: 'a1', name: 'Aluno 1' }] } }) // Alunos
      .mockResolvedValueOnce({ data: { success: true, data: [] } }); // Notas

    (api.post as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          tituloDaAtividade: 'Atividade Teste',
          resumoPedagogico: 'Resumo Teste',
          questoes: []
        }
      }
    });

    renderWithProviders(<ProfessorAIPage />);

    // Select Turma
    await waitFor(() => screen.getByText('Turma A'));
    fireEvent.change(screen.getByLabelText(/Selecione a Turma/i), { target: { value: 't1' } });

    // Select Aluno
    await waitFor(() => screen.getByText('Aluno 1'));
    fireEvent.change(screen.getByLabelText(/Aluno Alvo/i), { target: { value: 'a1' } });

    // Click Generate
    const btn = screen.getByText(/Gerar Materiais via IA/i);
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Atividade Teste')).toBeInTheDocument();
      expect(api.post).toHaveBeenCalledWith('/ai/generate-activity', {
        alunoId: 'a1',
        focoAtividade: 'reforco-matematica',
      });
    });
  });
});
