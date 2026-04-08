import React, { useState, useEffect, useCallback } from 'react';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!turmaId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await reportsService.getDashboardTurma(turmaId);
      setData(res);
    } catch (error: any) {
      console.error('Erro ao carregar analytics da turma', error);
      const status = error.response?.status;
      if (status === 403) {
        setErrorMsg('Acesso negado: privilégios insuficientes para visualizar esta turma.');
      } else if (status === 404) {
        setErrorMsg('Turma não encontrada ou inativa.');
      } else {
        setErrorMsg('Erro interno ao buscar relatórios. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  }, [turmaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="loading-overlay">Analisando dados pedagógicos...</div>;
  if (errorMsg) return <div className="p-8 text-red-400 font-semibold">{errorMsg}</div>;
  if (!data) return <div className="p-8 text-white">Turma sem dados analíticos publicados.</div>;

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
