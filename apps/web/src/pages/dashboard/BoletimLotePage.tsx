import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Printer, FileText } from 'lucide-react';
import { reportsService } from '../../services/reports.service.js';
import { api } from '../../services/api.js';
import type { BoletimIndividualResponse } from '@academiaflow/shared';
import { BoletimDocument } from '../../components/reports/BoletimDocument.js';
import '../../styles/dashboard.css';

const BoletimLotePage: React.FC = () => {
  const { turmaId } = useParams<{ turmaId: string }>();
  const [boletins, setBoletins] = useState<BoletimIndividualResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoletinsTurma = async () => {
      try {
        if (!turmaId) return;
        
        // Obter os alunos da turma. Em modo real, poderia-se ter um endpoint batch, mas para B1:
        const { data: alunosResponse } = await api.get(`/alunos?turmaId=${turmaId}`);
        if (!alunosResponse.success) {
          throw new Error('Falha ao carregar alunos da turma.');
        }

        const alunos = alunosResponse.data;
        if (alunos.length === 0) {
          throw new Error('Esta turma não possui alunos vinculados no momento.');
        }

        const _boletins: BoletimIndividualResponse[] = [];
        for (const al of alunos) {
            try {
               const b = await reportsService.getBoletimIndividual(al._id);
               if (b && b.disciplinas && b.disciplinas.length > 0) {
                 _boletins.push(b);
               }
            } catch {
               // Ignorar alunos que não tem boletim gerado ainda para não travar o lote inteiro
               console.warn(`Boletim não encontrado para aluno ${al._id}`);
            }
        }

        if (_boletins.length === 0) {
           throw new Error('Nenhum aluno da turma possui notas válidas para gerar boletim ainda.');
        }

        setBoletins(_boletins);
      } catch (err: unknown) {
        let message = 'Erro ao processar o lote de boletins.';
        if (axios.isAxiosError(err)) {
          message = err.response?.data?.message || message;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchBoletinsTurma();
  }, [turmaId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading-overlay">Sintetizando Lote Oficial de Documentos...</div>;
  if (error || boletins.length === 0) return (
    <div className="glass-panel flex-center" style={{ margin: '2rem', padding: '4rem', flexDirection: 'column', gap: '1rem' }}>
      <FileText size={48} className="text-red-400" />
      <p>{error || 'Lote impossível de ser gerado.'}</p>
      <button className="btn-primary" onClick={() => navigate(-1)}>Voltar</button>
    </div>
  );

  return (
    <div className="boletim-container lote-mode">
      {/* Opções de Controle */}
      <div className="no-print flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="btn-outline-small flex items-center gap-2">
          <ChevronLeft size={16} /> Voltar para a Turma
        </button>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold text-secondary mr-4">{boletins.length} Documentos a serem impressos</span>
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer size={16} /> Imprimir Lote
          </button>
        </div>
      </div>

      {/* Grid de documentos iterados via map() contendo page-break */}
      <div id="boletim-lote-print">
        {boletins.map((boletimUnit, index) => (
          <BoletimDocument key={index} data={boletimUnit} />
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; background: white !important; color: black !important; }
          #boletim-lote-print, #boletim-lote-print * { visibility: visible; }
          #boletim-lote-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          .no-print { display: none !important; }
          .glass-panel { border: 1px solid #ddd !important; border-radius: 0 !important; }
          .text-gradient { background: none !important; color: black !important; -webkit-text-fill-color: black !important; }
          th { border-bottom: 2px solid #000 !important; }
          td { border-bottom: 1px solid #eee !important; }
          .status-pill { border: 1px solid #000 !important; color: #000 !important; }
          
          /* CRITICAL PARA IMPRESSÃO EM LOTE */
          .print-item {
            page-break-after: always; /* Força quebra de página por aluno */
            break-after: page;
          }
          .print-item:last-child {
            page-break-after: avoid; /* não quebra no ultimo da fila vazia */
            break-after: auto;
          }
        }
        .boletim-container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        @media (max-width: 640px) { .boletim-container { padding: 0.5rem; } }
      `}</style>
    </div>
  );
};

export default BoletimLotePage;
