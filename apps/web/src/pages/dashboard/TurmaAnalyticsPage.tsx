import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportsService } from '../../services/reports.service.js';
import { TurmaPerformanceChart } from '../../components/dashboard/TurmaPerformanceChart.js';
import DashboardLayout from '../../components/layout/DashboardLayout.js';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { TurmaDashboard } from '@academiaflow/shared';

const TurmaAnalyticsPage: React.FC = () => {
  const { turmaId } = useParams<{ turmaId: string }>();
  const [data, setData] = useState<TurmaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    if (!turmaId) return;
    setLoading(true);
    try {
      const res = await reportsService.getDashboardTurma(turmaId);
      setData(res);
    } catch (error) {
      console.error('Erro ao carregar analytics da turma', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [turmaId]);

  if (loading) return <div className="loading-overlay">Analisando dados pedagógicos...</div>;
  if (!data) return <div className="p-8 text-white">Turma não encontrada ou sem dados analíticos.</div>;

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Analytics: {data.turmaName}</h1>
            <p className="text-gray-400 text-sm">Visão detalhada de performance e engajamento.</p>
          </div>
        </div>
        
        <button 
          onClick={fetchData} 
          className="btn-outline-small flex items-center gap-2"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <TurmaPerformanceChart data={data} />
    </DashboardLayout>
  );
};

export default TurmaAnalyticsPage;
