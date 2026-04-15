import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import GlassCard from '../ui/GlassCard.js';
import { AlertCircle, TrendingUp, Users, GraduationCap, BarChart2, Inbox } from 'lucide-react';
import type { TurmaDashboard } from '@academiaflow/shared';

interface Props {
  data: TurmaDashboard;
}

const HISTOGRAM_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

/** Empty-state reutilizável para painéis sem dados */
const ChartEmptyState: React.FC<{ message: string; hint?: string }> = ({ message, hint }) => (
  <div 
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '250px', gap: '0.75rem', textAlign: 'center', padding: '2rem 1rem' }}
    data-testid="chart-empty-state"
  >
    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '9999px', display: 'flex' }}>
      <Inbox size={28} color="#6b7280" />
    </div>
    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', margin: 0 }}>{message}</p>
    {hint && <p style={{ fontSize: '0.75rem', color: '#4b5563', maxWidth: '320px', margin: 0 }}>{hint}</p>}
  </div>
);

export const TurmaPerformanceChart: React.FC<Props> = ({ data }) => {
  const { metrics, distribution, studentsAtRisk, performanceBimestral } = data;

  // Transform bimestral DTO for Recharts — uses explicit `periodo` and `label`, not array index
  const bimestralChartData = performanceBimestral.map((slot) => ({
    name: slot.label,
    periodo: slot.periodo,
    media: slot.valor,
  }));

  // Empty-state guards
  const isBimestralAllNull = performanceBimestral.every(slot => slot.valor === null);
  const isDistributionEmpty = distribution.every(d => d.count === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <GlassCard className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Média da Turma</p>
            <h3 className="text-2xl font-bold text-white">{metrics.averageGrade ?? '--'}</h3>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-green-500/20 rounded-full text-green-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Taxa de Aprovação</p>
            <h3 className="text-2xl font-bold text-white">{metrics.approvalRate}%</h3>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-red-500/20 rounded-full text-red-400">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Alunos em Risco</p>
            <h3 className="text-2xl font-bold text-white">{studentsAtRisk.length}</h3>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-purple-500/20 rounded-full text-purple-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Total de Alunos</p>
            <h3 className="text-2xl font-bold text-white">{metrics.totalStudents}</h3>
          </div>
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Bimestral Performance Chart (Phase 2) */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={18} className="text-blue-400" />
            <h4 className="text-lg font-semibold text-white">Evolução Bimestral</h4>
          </div>
          <div style={{ height: '300px', width: '100%', minHeight: '300px', position: 'relative' }} data-testid="chart-wrapper">
            {isBimestralAllNull ? (
              <ChartEmptyState
                message="Nenhuma avaliação registrada ainda."
                hint="As médias por bimestre serão exibidas conforme as notas forem lançadas."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bimestralChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 10]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number | string | (number | string)[]) => {
                      if (value === null || value === undefined) return ['Sem dados', 'Média'];
                      return [Number(value).toFixed(2), 'Média'];
                    }}
                  />
                  <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                    {bimestralChartData.map((entry) => (
                      <Cell 
                        key={`bim-cell-${entry.periodo}`} 
                        fill={entry.media === null ? '#4b5563' : entry.media < 6 ? '#ef4444' : '#3b82f6'}
                        opacity={entry.media === null ? 0.3 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Histogram */}
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-white mb-6">Distribuição de Notas</h4>
          <div style={{ height: '300px', width: '100%', minHeight: '300px', position: 'relative' }} data-testid="chart-wrapper">
            {isDistributionEmpty ? (
              <ChartEmptyState
                message="Nenhuma nota lançada nesta turma."
                hint="A distribuição por faixa de nota será exibida conforme as avaliações forem registradas."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis 
                    dataKey="range" 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={HISTOGRAM_COLORS[index % HISTOGRAM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Priority Intervention List */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-semibold text-white">Intervenção Prioritária</h4>
          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Médias abaixo de 6.0</span>
        </div>
        <div className="space-y-4">
          {studentsAtRisk.length > 0 ? (
            studentsAtRisk.map((student) => (
              <div key={student._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                    {student.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-200">{student.name}</span>
                </div>
                <span className="text-sm font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                  {student.average != null ? student.average.toFixed(1) : '--'}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 italic">
              Nenhum aluno em situação de risco crítico.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
