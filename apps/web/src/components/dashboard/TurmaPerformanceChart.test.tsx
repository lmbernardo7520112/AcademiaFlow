import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { TurmaPerformanceChart } from '../../components/dashboard/TurmaPerformanceChart';
import type { TurmaDashboard } from '@academiaflow/shared';

// Recharts usa ResizeObserver que não existe em jsdom — mock necessário
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: () => null,
}));

const makeSlot = (periodo: 1 | 2 | 3 | 4, valor: number | null) => ({
  periodo,
  valor,
  label: `${periodo}º Bimestre`,
});

const makeDistribution = (counts: number[]) => [
  { range: '0-4', count: counts[0] ?? 0 },
  { range: '4-6', count: counts[1] ?? 0 },
  { range: '6-8', count: counts[2] ?? 0 },
  { range: '8-10', count: counts[3] ?? 0 },
];

const baseMetrics: TurmaDashboard['metrics'] = {
  averageGrade: null,
  approvalRate: 0,
  reprovadosRate: 0,
  recoveryRate: 0,
  totalStudents: 0,
};

describe('TurmaPerformanceChart — D1 Empty-State & Rendering', () => {
  it('D1-UI-01: renderiza KPI cards corretamente com dados normais', () => {
    const data: TurmaDashboard = {
      turmaId: 'turma-1',
      turmaName: 'Turma Teste',
      metrics: { ...baseMetrics, averageGrade: 7.5, approvalRate: 80, totalStudents: 25 },
      performanceBimestral: [
        makeSlot(1, 7.5),
        makeSlot(2, 6.8),
        makeSlot(3, 7.2),
        makeSlot(4, 8.0),
      ],
      distribution: makeDistribution([2, 5, 10, 8]),
      studentsAtRisk: [],
    };

    render(<TurmaPerformanceChart data={data} />);

    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Evolução Bimestral')).toBeInTheDocument();
    expect(screen.getByText('Distribuição de Notas')).toBeInTheDocument();
  });

  it('D1-UI-02: exibe gráficos reais (não empty-state) quando há dados', () => {
    const data: TurmaDashboard = {
      turmaId: 'turma-1',
      turmaName: 'Turma Teste',
      metrics: baseMetrics,
      performanceBimestral: [
        makeSlot(1, 7.0),
        makeSlot(2, null),
        makeSlot(3, null),
        makeSlot(4, null),
      ],
      distribution: makeDistribution([0, 0, 1, 0]),
      studentsAtRisk: [],
    };

    render(<TurmaPerformanceChart data={data} />);

    // Com pelo menos 1 slot não-nulo, deve mostrar o gráfico (não empty-state)
    expect(screen.queryByText('Nenhuma avaliação registrada ainda.')).not.toBeInTheDocument();
    // Com pelo menos 1 faixa não-zerada, deve mostrar o histogram
    expect(screen.queryByText('Nenhuma nota lançada nesta turma.')).not.toBeInTheDocument();
    // Recharts deve estar renderizado
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(2);
  });

  it('D1-UI-03: exibe empty-state honesto quando performanceBimestral é todo-nulo', () => {
    const data: TurmaDashboard = {
      turmaId: 'turma-1',
      turmaName: 'Turma Teste',
      metrics: baseMetrics,
      performanceBimestral: [
        makeSlot(1, null),
        makeSlot(2, null),
        makeSlot(3, null),
        makeSlot(4, null),
      ],
      distribution: makeDistribution([1, 0, 0, 0]),
      studentsAtRisk: [],
    };

    render(<TurmaPerformanceChart data={data} />);

    // Deve exibir empty-state para o gráfico bimestral
    expect(screen.getByText('Nenhuma avaliação registrada ainda.')).toBeInTheDocument();
    // Mas o histogram com dados deve continuar renderizando
    expect(screen.queryByText('Nenhuma nota lançada nesta turma.')).not.toBeInTheDocument();
  });

  it('D1-UI-04: exibe empty-state honesto quando distribution tem todos os counts zerados', () => {
    const data: TurmaDashboard = {
      turmaId: 'turma-1',
      turmaName: 'Turma Teste',
      metrics: baseMetrics,
      performanceBimestral: [
        makeSlot(1, 7.0),
        makeSlot(2, null),
        makeSlot(3, null),
        makeSlot(4, null),
      ],
      // Todos os counts = 0 (turma sem notas registradas)
      distribution: makeDistribution([0, 0, 0, 0]),
      studentsAtRisk: [],
    };

    render(<TurmaPerformanceChart data={data} />);

    // Deve exibir empty-state para a distribuição
    expect(screen.getByText('Nenhuma nota lançada nesta turma.')).toBeInTheDocument();
    // Mas o gráfico bimestral com dados deve continuar
    expect(screen.queryByText('Nenhuma avaliação registrada ainda.')).not.toBeInTheDocument();
  });

  it('D1-UI-05: exibe ambos os empty-states quando turma não tem dados alguns', () => {
    const data: TurmaDashboard = {
      turmaId: 'turma-1',
      turmaName: 'Turma Sem Dados',
      metrics: baseMetrics,
      performanceBimestral: [
        makeSlot(1, null),
        makeSlot(2, null),
        makeSlot(3, null),
        makeSlot(4, null),
      ],
      distribution: makeDistribution([0, 0, 0, 0]),
      studentsAtRisk: [],
    };

    render(<TurmaPerformanceChart data={data} />);

    expect(screen.getByText('Nenhuma avaliação registrada ainda.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma nota lançada nesta turma.')).toBeInTheDocument();
    // Nenhum bar-chart deve ser renderizado
    expect(screen.queryAllByTestId('bar-chart')).toHaveLength(0);
  });

  it('D1-UI-06: lista studentsAtRisk corretamente quando há alunos em risco', () => {
    const data: TurmaDashboard = {
      turmaId: 'turma-1',
      turmaName: 'Turma Risco',
      metrics: baseMetrics,
      performanceBimestral: [makeSlot(1, null), makeSlot(2, null), makeSlot(3, null), makeSlot(4, null)],
      distribution: makeDistribution([0, 0, 0, 0]),
      studentsAtRisk: [
        { _id: 'aluno-1', name: 'Ana Silva', average: 3.5 },
        { _id: 'aluno-2', name: 'Bruno Souza', average: 2.8 },
      ],
    };

    render(<TurmaPerformanceChart data={data} />);

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Souza')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('2.8')).toBeInTheDocument();
  });
});
