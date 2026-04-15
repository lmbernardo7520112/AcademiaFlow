import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import GlassCard from '../ui/GlassCard.js';
import { Users, BookOpen, AlertCircle } from 'lucide-react';
import type { ProfessorAnalytics } from '@academiaflow/shared';

interface Props {
  data: ProfessorAnalytics;
}

export const ProfessorAnalyticsHeader: React.FC<Props> = ({ data }) => {
  const { globalAverage, riskTotal, classes, context } = data;

  return (
    <div className="professor-analytics-grid">
      {/* Stat Cards Sidebar */}
      <div className="analytics-sidebar">
        <GlassCard className="analytics-stat-card analytics-stat-blue">
          <div className="analytics-stat-icon blue">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="analytics-stat-label">
              {context ? `Média da Turma: ${context.turmaName}` : 'Média Global'}
            </p>
            <h3 className="analytics-stat-value">{globalAverage || '--'}</h3>
          </div>
        </GlassCard>

        <GlassCard className="analytics-stat-card analytics-stat-red">
          <div className="analytics-stat-icon red">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="analytics-stat-label">Alunos em Faixa de Risco</p>
            <h3 className="analytics-stat-value">{riskTotal}</h3>
          </div>
        </GlassCard>

        <GlassCard className="analytics-stat-card analytics-stat-purple">
          <div className="analytics-stat-icon purple">
            <Users size={24} />
          </div>
          <div>
            <p className="analytics-stat-label">Turmas Ativas</p>
            <h3 className="analytics-stat-value">{classes.length}</h3>
          </div>
        </GlassCard>
      </div>

      {/* Class Comparison Chart */}
      <GlassCard className="analytics-chart-card">
        <h4 className="chart-title">Desempenho por Turma</h4>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classes}>
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                domain={[0, 10]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                {classes.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.average && entry.average < 6 ? '#ef4444' : '#3b82f6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
};
