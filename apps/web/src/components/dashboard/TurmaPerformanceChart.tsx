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
import { AlertCircle, TrendingUp, Users, GraduationCap } from 'lucide-react';
import type { TurmaDashboard } from '@academiaflow/shared';

interface Props {
  data: TurmaDashboard;
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export const TurmaPerformanceChart: React.FC<Props> = ({ data }) => {
  const { metrics, distribution, studentsAtRisk } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Média da Turma</p>
            <h3 className="text-2xl font-bold text-white">{metrics.averageGrade || '--'}</h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histogram */}
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-white mb-6">Distribuição de Notas</h4>
          <div className="h-[300px]">
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

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
                    {student.average.toFixed(1)}
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
    </div>
  );
};
