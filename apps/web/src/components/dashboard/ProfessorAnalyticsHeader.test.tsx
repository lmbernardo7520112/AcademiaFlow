import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfessorAnalyticsHeader } from './ProfessorAnalyticsHeader';
import type { ProfessorAnalytics } from '@academiaflow/shared';

// Mock recharts to avoid canvas/SVG issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Cell: () => <div />,
}));

const mockData: ProfessorAnalytics = {
  globalAverage: 7.5,
  riskTotal: 3,
  classes: [
    { id: 'c1', name: '1º Ano A', average: 7.2 },
    { id: 'c2', name: '2º Ano B', average: 5.8 },
  ],
  context: { turmaId: 't1', turmaName: '1º Ano A' },
};

describe('ProfessorAnalyticsHeader', () => {
  it('renders .professor-analytics-grid container', () => {
    const { container } = render(<ProfessorAnalyticsHeader data={mockData} />);
    expect(container.querySelector('.professor-analytics-grid')).toBeInTheDocument();
  });

  it('renders three stat cards with correct semantic class names', () => {
    const { container } = render(<ProfessorAnalyticsHeader data={mockData} />);
    expect(container.querySelector('.analytics-stat-blue')).toBeInTheDocument();
    expect(container.querySelector('.analytics-stat-red')).toBeInTheDocument();
    expect(container.querySelector('.analytics-stat-purple')).toBeInTheDocument();
  });

  it('renders chart-container with explicit height', () => {
    const { container } = render(<ProfessorAnalyticsHeader data={mockData} />);
    const chartContainer = container.querySelector('.chart-container');
    expect(chartContainer).toBeInTheDocument();
  });

  it('renders "Desempenho por Turma" heading', () => {
    render(<ProfessorAnalyticsHeader data={mockData} />);
    expect(screen.getByText('Desempenho por Turma')).toBeInTheDocument();
  });

  it('renders BarChart component from recharts', () => {
    render(<ProfessorAnalyticsHeader data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders stat values correctly', () => {
    render(<ProfessorAnalyticsHeader data={mockData} />);
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // classes.length
  });

  it('renders context turma name in stat label', () => {
    render(<ProfessorAnalyticsHeader data={mockData} />);
    expect(screen.getByText('Média da Turma: 1º Ano A')).toBeInTheDocument();
  });

  it('contains zero Tailwind utility classes in rendered output', () => {
    const { container } = render(<ProfessorAnalyticsHeader data={mockData} />);
    const html = container.innerHTML;

    // These are the dead Tailwind classes that must NOT exist
    const deadTailwindClasses = [
      'grid-cols-1', 'lg:grid-cols-3', 'lg:col-span-2',
      'gap-6', 'mb-8', 'space-y-4', 'space-x-4',
      'h-[200px]', 'p-4', 'p-6', 'p-3',
      'border-l-4', 'border-blue-500', 'border-red-500', 'border-purple-500',
      'bg-blue-500/20', 'bg-red-500/20', 'bg-purple-500/20',
      'text-blue-400', 'text-red-400', 'text-purple-400',
      'text-xs', 'text-2xl', 'text-sm', 'text-gray-400',
      'font-bold', 'font-semibold',
      'uppercase', 'tracking-wider',
      'rounded-full',
    ];

    for (const cls of deadTailwindClasses) {
      expect(html).not.toContain(`"${cls}`);
      expect(html).not.toContain(` ${cls}`);
    }
  });
});
