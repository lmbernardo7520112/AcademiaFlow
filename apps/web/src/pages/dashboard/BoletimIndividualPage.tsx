import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Printer, FileText } from 'lucide-react';
import { reportsService } from '../../services/reports.service.js';
import type { BoletimIndividualResponse } from '@academiaflow/shared';
import { BoletimDocument } from '../../components/reports/BoletimDocument';
import '../../styles/dashboard.css';

const BoletimIndividualPage: React.FC = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const [data, setData] = useState<BoletimIndividualResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoletim = async () => {
      try {
        if (!alunoId) return;
        const responseData = await reportsService.getBoletimIndividual(alunoId);
        setData(responseData);
      } catch (err: unknown) {
        let message = 'Erro ao carregar boletim.';
        if (axios.isAxiosError(err)) {
          message = err.response?.data?.message || message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchBoletim();
  }, [alunoId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading-overlay">Gerando Documento Oficial...</div>;
  if (error || !data) return (
    <div className="glass-panel flex-center" style={{ margin: '2rem', padding: '4rem', flexDirection: 'column', gap: '1rem' }}>
      <FileText size={48} className="text-red-400" />
      <p>{error || 'Dados não encontrados.'}</p>
      <button className="btn-primary" onClick={() => navigate(-1)}>Voltar</button>
    </div>
  );

  return (
    <div className="boletim-container">
      {/* Opções de Controle (Ocultas na Impressão) */}
      <div className="no-print flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="btn-outline-small flex items-center gap-2">
          <ChevronLeft size={16} /> Voltar para Alunos
        </button>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer size={16} /> Imprimir em PDF
          </button>
        </div>
      </div>

      {/* Documento do Boletim */}
      <div id="boletim-print">
        <BoletimDocument data={data} />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; background: white !important; color: black !important; }
          .boletim-document, .boletim-document * { visibility: visible; }
          .boletim-document { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          .no-print { display: none !important; }
          .glass-panel { border: 1px solid #ddd !important; border-radius: 0 !important; }
          .text-gradient { background: none !important; color: black !important; -webkit-text-fill-color: black !important; }
          th { border-bottom: 2px solid #000 !important; }
          td { border-bottom: 1px solid #eee !important; }
          .status-pill { border: 1px solid #000 !important; color: #000 !important; }
        }
        .boletim-container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        @media (max-width: 640px) { .boletim-container { padding: 0.5rem; } }
      `}</style>
    </div>
  );
};

export default BoletimIndividualPage;
