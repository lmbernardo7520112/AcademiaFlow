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
  const { globalAverage, riskTotal, classes } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Global Highlights */}
      <div className="space-y-4">
        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-blue-500">
          <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Média Global</p>
            <h3 className="text-2xl font-bold text-white">{globalAverage || '--'}</h3>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-red-500">
          <div className="p-3 bg-red-500/20 rounded-full text-red-400">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Alunos em Faixa de Risco</p>
            <h3 className="text-2xl font-bold text-white">{riskTotal}</h3>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center space-x-4 border-l-4 border-purple-500">
          <div className="p-3 bg-purple-500/20 rounded-full text-purple-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Turmas Ativas</p>
            <h3 className="text-2xl font-bold text-white">{classes.length}</h3>
          </div>
        </GlassCard>
      </div>

      {/* Class Comparison Chart */}
      <GlassCard className="lg:col-span-2 p-6">
        <h4 className="text-sm font-semibold text-gray-400 uppercase mb-4">Desempenho por Turma</h4>
        <div className="h-[200px]">
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
