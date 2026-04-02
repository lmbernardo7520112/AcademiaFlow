import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GradeManagement from './GradeManagement';
import { api } from '../../services/api';

// Mock API and Auth
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'prof1', role: 'professor', tenantId: 'tenant1' },
    isAuthenticated: true,
  }),
}));

describe('GradeManagement Component', () => {
  const mockStudents = [
    { _id: 'student1', name: 'Alvo Dumbledore', matricula: 'GRYF-001' },
  ];

  const mockBoletins = [
    {
      alunoId: 'student1',
      notas: { bimestre1: 5.0, bimestre2: 5.0, bimestre3: null, bimestre4: null },
      nf: 5.0,
      situacao: 'Recuperação',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate NF and Situation correctly when grades are changed', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/alunos')) return Promise.resolve({ data: { success: true, data: mockStudents } });
      if (url.includes('/notas/boletim')) return Promise.resolve({ data: { success: true, data: mockBoletins } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(
      <MemoryRouter initialEntries={['/professor/notas/turma1/disc1']}>
        <Routes>
          <Route path="/professor/notas/:turmaId/:disciplinaId" element={<GradeManagement />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('Alvo Dumbledore')).toBeInTheDocument();

    if (!screen.queryByText('Alvo Dumbledore')) {
      console.log('DOM when failing:', screen.debug());
    }

    expect(screen.getByText('Alvo Dumbledore')).toBeInTheDocument();

    // Initial state from mockBoletins
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // B1/B2
    expect(screen.getByText('Recuperação')).toBeInTheDocument();

    // Change B3 to 8.0
    const inputs = screen.getAllByRole('spinbutton');
    // B1=0, B2=1, B3=2, B4=3, PF=4
    fireEvent.change(inputs[2], { target: { value: '8' } });

    // New NF: (5 + 5 + 8) / 3 = 6.0
    await waitFor(() => expect(screen.getByText('Aprovado')).toBeInTheDocument());
    expect(screen.getByText('6')).toBeInTheDocument(); // NF column
  });
});
