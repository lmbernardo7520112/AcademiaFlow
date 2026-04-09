import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BoletimIndividualPage from './BoletimIndividualPage';
import { reportsService } from '../../services/reports.service';

// Tipagem para evitar 'any' no mock
interface MockNota {
  bimestre1: number | null;
  bimestre2: number | null;
  bimestre3: number | null;
  bimestre4: number | null;
  pf: number | null;
}

interface MockDisciplina {
  id: string;
  name: string;
  notas: MockNota;
  nf: number | null;
  mf: number | null;
  mg: number | null;
  situacao: string;
}

interface MockBoletim {
  aluno: {
    id: string;
    name: string;
    matricula: string;
    turmaName: string;
  };
  year: number;
  disciplinas: MockDisciplina[];
}

vi.mock('../../services/reports.service', () => ({
  reportsService: {
    getBoletimIndividual: vi.fn(),
  },
}));

const mockBoletimData: MockBoletim = {
  aluno: {
    id: '123',
    name: 'João Silva',
    matricula: '2024001',
    turmaName: 'Turma A',
  },
  year: 2024,
  disciplinas: [
    {
      id: 'd1',
      name: 'Matemática',
      notas: {
        bimestre1: 8.5,
        bimestre2: null,
        bimestre3: 7.0,
        bimestre4: null,
        pf: null,
      },
      nf: null,
      mf: null,
      mg: 7.75,
      situacao: 'Cursando',
    },
    {
      id: 'd2',
      name: 'Português',
      notas: {
        bimestre1: null,
        bimestre2: null,
        bimestre3: null,
        bimestre4: null,
        pf: null,
      },
      nf: null,
      mf: null,
      mg: null,
      situacao: 'Cursando',
    },
  ],
};

describe('BoletimIndividualPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar notas pendentes como "-" e média geral pendente como "-"', async () => {
    vi.mocked(reportsService.getBoletimIndividual).mockResolvedValue(mockBoletimData as unknown as MockBoletim);

    render(
      <MemoryRouter initialEntries={['/boletim/123']}>
        <Routes>
          <Route path="/boletim/:alunoId" element={<BoletimIndividualPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verifica loading
    expect(screen.getByText(/Gerando Documento Oficial/i)).toBeInTheDocument();

    // Aguarda a renderização dos dados do João
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Turma A')).toBeInTheDocument();
    });

    // Matemática: B1 (8.5), B2 (-), B3 (7.0), B4 (-)
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('7.0')).toBeInTheDocument();
    
    // Verificamos o traço para B2 e B4 de Matemática (pode ter vários traços na tela)
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(6);
    
    // Português: Tudo pendente
    expect(screen.getByText('Português')).toBeInTheDocument();
  });

  it('deve exibir erro se o serviço falhar', async () => {
    vi.mocked(reportsService.getBoletimIndividual).mockRejectedValue(new Error('Falha na API'));

    render(
      <MemoryRouter initialEntries={['/boletim/123']}>
        <Routes>
          <Route path="/boletim/:alunoId" element={<BoletimIndividualPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar boletim/i)).toBeInTheDocument();
    });
  });
});
