import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Printer, FileText } from 'lucide-react';
import { reportsService } from '../../services/reports.service.js';
import type { BoletimIndividualResponse } from '@academiaflow/shared';
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

  const { aluno, year, disciplinas } = data;

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
      <div className="boletim-document glass-panel print:shadow-none print:border-none" id="boletim-print">
        <div className="boletim-header text-center mb-8 border-b border-white/10 pb-6">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-gradient">Boletim Escolar Oficial</h1>
          <p className="text-secondary text-sm mt-1">AcademiaFlow Legacy - Sistema de Gestão Educacional</p>
        </div>

        <div className="student-info grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
          <div>
            <span className="block text-secondary font-bold uppercase text-[10px]">Aluno(a)</span>
            <span className="text-white font-semibold">{aluno.name}</span>
          </div>
          <div>
            <span className="block text-secondary font-bold uppercase text-[10px]">Matrícula</span>
            <span className="text-white font-semibold">{aluno.matricula}</span>
          </div>
          <div>
            <span className="block text-secondary font-bold uppercase text-[10px]">Turma</span>
            <span className="text-white font-semibold">{aluno.turmaName || 'Não informada'}</span>
          </div>
          <div>
            <span className="block text-secondary font-bold uppercase text-[10px]">Ano Letivo</span>
            <span className="text-white font-semibold">{year}</span>
          </div>
        </div>

        <div className="results-table overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="py-3 px-4 font-bold text-xs uppercase text-blue-400">Disciplina</th>
                <th className="py-3 px-4 font-bold text-xs uppercase text-center">B1</th>
                <th className="py-3 px-4 font-bold text-xs uppercase text-center">B2</th>
                <th className="py-3 px-4 font-bold text-xs uppercase text-center">B3</th>
                <th className="py-3 px-4 font-bold text-xs uppercase text-center">B4</th>
                <th className="py-3 px-4 font-bold text-xs uppercase text-center bg-blue-500/10">Média Geral</th>
                <th className="py-3 px-4 font-bold text-xs uppercase text-center">Situação</th>
              </tr>
            </thead>
            <tbody>
              {disciplinas.map((d, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-4 text-sm font-semibold">{d.name}</td>
                  <td className="py-4 px-4 text-center text-sm">{d.notas.bimestre1 !== null ? d.notas.bimestre1.toFixed(1) : '-'}</td>
                  <td className="py-4 px-4 text-center text-sm">{d.notas.bimestre2 !== null ? d.notas.bimestre2.toFixed(1) : '-'}</td>
                  <td className="py-4 px-4 text-center text-sm">{d.notas.bimestre3 !== null ? d.notas.bimestre3.toFixed(1) : '-'}</td>
                  <td className="py-4 px-4 text-center text-sm">{d.notas.bimestre4 !== null ? d.notas.bimestre4.toFixed(1) : '-'}</td>
                  <td className="py-4 px-4 text-center text-sm font-bold bg-blue-500/5">
                    {d.mg !== null ? d.mg.toFixed(1) : '--'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`status-pill ${d.situacao === 'Aprovado' || d.situacao.includes('Aprovado') ? 'active' : 'inactive'}`} style={{ fontSize: '10px' }}>
                      {d.situacao.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="boletim-footer mt-12 grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
          <div className="text-center">
            <div className="w-full border-b border-white/30 h-8 mb-2"></div>
            <p className="text-[10px] text-secondary uppercase font-bold">Assinatura da Secretaria</p>
          </div>
          <div className="text-center">
            <div className="w-full border-b border-white/30 h-8 mb-2"></div>
            <p className="text-[10px] text-secondary uppercase font-bold">Assinatura do Responsável</p>
          </div>
        </div>

        <div className="text-[9px] text-secondary mt-8 italic text-center print:block hidden">
          Documento gerado eletronicamente via AcademiaFlow em {new Date().toLocaleDateString()}.
        </div>
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
