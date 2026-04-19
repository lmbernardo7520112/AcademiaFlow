import { useState, useEffect, useCallback } from 'react';
import { parseAbsenceList, computePreviewHash } from '@academiaflow/shared';
import type { ParseResult } from '@academiaflow/shared';
import { buscaAtivaApi } from '../../../services/buscaAtiva';
import type { BuscaAtivaCase } from '../../../services/buscaAtiva';
import CaseCard from './CaseCard';
import WhatsAppModal from './WhatsAppModal';
import ImportConflictModal from './ImportConflictModal';
import './busca-ativa.css';

type TabView = 'import' | 'queue' | 'history';

export default function BuscaAtivaPage() {
  const [activeTab, setActiveTab] = useState<TabView>('import');
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [cases, setCases] = useState<BuscaAtivaCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<Record<string, unknown> | null>(null);
  const [whatsAppCase, setWhatsAppCase] = useState<BuscaAtivaCase | null>(null);
  const [whatsAppContactId, setWhatsAppContactId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [turmaFilter, setTurmaFilter] = useState<string>('');

  // ─── Load cases ────────────────────────────────────────────────────────────

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await buscaAtivaApi.listCases({
        status: statusFilter || undefined,
        turmaName: turmaFilter || undefined,
      });
      setCases(res.data || []);
    } catch {
      setError('Erro ao carregar casos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, turmaFilter]);

  useEffect(() => {
    if (activeTab === 'queue') loadCases();
  }, [activeTab, loadCases]);

  // ─── Preview (client-side parse) ──────────────────────────────────────────

  const handlePreview = () => {
    if (!rawText.trim()) return;
    setError(null);
    setImportResult(null);
    const result = parseAbsenceList(rawText);
    setPreview(result);
  };

  // ─── Import ────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    setImportResult(null);
    setConflictData(null);

    try {
      const parsed = parseAbsenceList(rawText);
      const previewHash = await computePreviewHash(parsed.entries);
      const res = await buscaAtivaApi.importList(rawText, previewHash);

      if (res.success) {
        setImportResult(res);
        setRawText('');
        setPreview(null);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: Record<string, unknown> } };
      if (axiosErr.response?.status === 409) {
        setConflictData(axiosErr.response.data || null);
      } else if (axiosErr.response?.status === 503) {
        setError((axiosErr.response.data as { message?: string })?.message || 'Backfill pendente');
      } else {
        setError('Erro ao importar listagem');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Replace (from conflict modal) ────────────────────────────────────────

  const handleReplace = async (importId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await buscaAtivaApi.replaceImport(importId, rawText);
      if (res.success) {
        setImportResult(res);
        setConflictData(null);
        setRawText('');
        setPreview(null);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Erro ao substituir importação');
      setConflictData(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── WhatsApp Modal ────────────────────────────────────────────────────────

  const openWhatsApp = (caso: BuscaAtivaCase, contactId: string) => {
    setWhatsAppCase(caso);
    setWhatsAppContactId(contactId);
  };

  const closeWhatsApp = () => {
    setWhatsAppCase(null);
    setWhatsAppContactId(null);
    loadCases();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ba-container">
      <header className="ba-header">
        <h1>Busca Ativa de Alunos Faltosos</h1>
        <p className="ba-subtitle">Central operacional para gestão de faltas e contato com responsáveis</p>
      </header>

      {/* Tab Navigation */}
      <nav className="ba-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'import'}
          className={`ba-tab ${activeTab === 'import' ? 'ba-tab--active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📋 Importar Listagem
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'queue'}
          className={`ba-tab ${activeTab === 'queue' ? 'ba-tab--active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          📞 Fila de Contato ({cases.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`ba-tab ${activeTab === 'history' ? 'ba-tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📊 Histórico
        </button>
      </nav>

      {/* Error/Success Banners */}
      {error && (
        <div className="ba-banner ba-banner--error" role="alert">
          <span>⚠️</span> {error}
          <button onClick={() => setError(null)} className="ba-banner__close">×</button>
        </div>
      )}
      {importResult && (
        <div className="ba-banner ba-banner--success" role="status">
          <span>✅</span> Importação concluída: {(importResult as { casesCreated?: number }).casesCreated || 0} casos criados
          <button onClick={() => setImportResult(null)} className="ba-banner__close">×</button>
        </div>
      )}

      {/* ─── Import Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="ba-panel">
          <div className="ba-import-section">
            <label htmlFor="ba-raw-text" className="ba-label">
              Cole a listagem de alunos faltosos abaixo:
            </label>
            <textarea
              id="ba-raw-text"
              className="ba-textarea"
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`BUSCA ATIVA – ALUNOS FALTOSOS\n📅 17/04/2026\n\n1ª SÉRIE A\n* João Silva\nMãe: Ana (83 99999-0000)\n\n* Maria Santos\nResp.: Rita (47 98888-1111)`}
              rows={16}
            />
            <div className="ba-actions">
              <button
                className="ba-btn ba-btn--secondary"
                onClick={handlePreview}
                disabled={!rawText.trim()}
              >
                👁️ Preview
              </button>
              <button
                className="ba-btn ba-btn--primary"
                onClick={handleImport}
                disabled={!rawText.trim() || loading}
              >
                {loading ? '⏳ Importando...' : '📥 Importar'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="ba-preview">
              <h3>Preview da Listagem</h3>
              <div className="ba-preview__stats">
                <span className="ba-stat">📋 {preview.stats.totalEntries} alunos</span>
                <span className="ba-stat ba-stat--ok">📱 {preview.stats.withPhone} com telefone</span>
                <span className="ba-stat ba-stat--warn">⚠️ {preview.stats.withoutPhone} sem telefone</span>
                {preview.stats.justified > 0 && (
                  <span className="ba-stat ba-stat--info">✅ {preview.stats.justified} justificados</span>
                )}
                {preview.stats.transfers > 0 && (
                  <span className="ba-stat ba-stat--info">🔄 {preview.stats.transfers} possíveis transferências</span>
                )}
              </div>
              {preview.date && (
                <p className="ba-preview__date">
                  📅 Data: {new Date(preview.date).toLocaleDateString('pt-BR')}
                </p>
              )}
              {preview.warnings.length > 0 && (
                <div className="ba-warnings">
                  <h4>⚠️ Avisos ({preview.warnings.length})</h4>
                  <ul>
                    {preview.warnings.slice(0, 10).map((w, i) => (
                      <li key={i} className="ba-warning-item">
                        <span className="ba-warning-type">{w.type}</span> {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="ba-preview__entries">
                <h4>Alunos Identificados</h4>
                <div className="ba-entries-grid">
                  {preview.entries.map((entry, i) => (
                    <div key={i} className="ba-entry-card">
                      <div className="ba-entry-card__header">
                        <strong>{entry.alunoName}</strong>
                        <span className="ba-entry-card__turma">{entry.turmaName}</span>
                      </div>
                      {entry.flags.justified_in_source && (
                        <span className="ba-badge ba-badge--justified">Justificado</span>
                      )}
                      {entry.flags.possible_transfer && (
                        <span className="ba-badge ba-badge--transfer">Possível Transferência</span>
                      )}
                      {entry.contacts.length > 0 && (
                        <div className="ba-entry-card__contacts">
                          {entry.contacts.map((c, j) => (
                            <div key={j} className="ba-mini-contact">
                              <span className="ba-mini-contact__role">{c.role}:</span> {c.name}
                              {c.phones.map((p, k) => (
                                <span key={k} className={`ba-phone-badge ${p.phoneE164 ? 'ba-phone-badge--valid' : 'ba-phone-badge--invalid'}`}>
                                  {p.phoneRaw} {p.phoneE164 ? '✅' : '⚠️'}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Queue Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div className="ba-panel">
          <div className="ba-filters">
            <select
              className="ba-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option value="NOVO">🆕 Novo</option>
              <option value="PENDENTE">⏳ Pendente</option>
              <option value="CONTATO_INICIADO">📞 Contato Iniciado</option>
              <option value="AGUARDANDO_RESPOSTA">⏱️ Aguardando Resposta</option>
              <option value="RESPONDIDO">💬 Respondido</option>
              <option value="TELEFONE_INVALIDO">❌ Telefone Inválido</option>
              <option value="SEM_RETORNO">🔇 Sem Retorno</option>
            </select>
            <input
              type="text"
              className="ba-input"
              placeholder="Filtrar por turma..."
              value={turmaFilter}
              onChange={e => setTurmaFilter(e.target.value)}
            />
            <button className="ba-btn ba-btn--secondary" onClick={loadCases}>
              🔄 Atualizar
            </button>
          </div>

          {loading ? (
            <div className="ba-loading">⏳ Carregando casos...</div>
          ) : cases.length === 0 ? (
            <div className="ba-empty">
              <p>Nenhum caso encontrado.</p>
              <p className="ba-empty__hint">Importe uma listagem para começar.</p>
            </div>
          ) : (
            <div className="ba-cases-grid">
              {cases.map(caso => (
                <CaseCard
                  key={caso._id}
                  caso={caso}
                  onContactClick={openWhatsApp}
                  onStatusChange={async (newStatus) => {
                    await buscaAtivaApi.updateCaseStatus(caso._id, newStatus);
                    loadCases();
                  }}
                  onRefresh={loadCases}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── History Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="ba-panel">
          <p className="ba-placeholder">📊 Histórico de importações — em breve.</p>
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      {conflictData && (
        <ImportConflictModal
          data={conflictData}
          onReplace={(importId) => handleReplace(importId)}
          onCancel={() => setConflictData(null)}
        />
      )}

      {whatsAppCase && whatsAppContactId && (
        <WhatsAppModal
          caso={whatsAppCase}
          contactId={whatsAppContactId}
          onClose={closeWhatsApp}
        />
      )}
    </div>
  );
}
