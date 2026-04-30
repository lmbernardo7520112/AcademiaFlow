import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Plus, X, Search, ArrowLeftRight, AlertCircle, CheckCircle2, Clock, Loader2, XCircle, Wand2, UserCheck } from 'lucide-react';
import { siageApi, SIAGE_STATUS_LABELS, SIAGE_STATUS_COLORS, isTerminalStatus, isProcessing } from '../../../services/siage';
import { api } from '../../../services/api';
import type { SiageRun, SiageRunItem, SiageAlias, SiageRunStatus } from '../../../services/siage';
import '../../../styles/dashboard.css';

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SiageRunStatus }) {
  const color = SIAGE_STATUS_COLORS[status] || '#888';
  const label = SIAGE_STATUS_LABELS[status] || status;
  const processing = isProcessing(status);
  return (
    <span className="status-pill" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {processing && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', marginRight: 4 }} />}
      {status === 'COMPLETED' && <CheckCircle2 size={12} style={{ marginRight: 4 }} />}
      {status === 'FAILED' && <XCircle size={12} style={{ marginRight: 4 }} />}
      {status === 'QUEUED' && <Clock size={12} style={{ marginRight: 4 }} />}
      {label}
    </span>
  );
}

// ─── PDF Import Form (Alternativa A) ─────────────────────────────────────────

interface PilotPolicyData {
  isRestricted: boolean;
  allowedBimesters: number[];
}

interface PdfPreview {
  header: {
    schoolName: string;
    turmaEtapa: string;
    componenteCurricular: string;
    professor: string;
    turno: string;
    sala: string;
    issuedAt: string;
    issuedBy: string;
  };
  students: Array<{
    studentName: string;
    bimester1: number | null;
    situation: string;
    frequency: string | null;
  }>;
  records: Array<{
    alunoName: string;
    disciplinaName: string;
    turmaName: string;
    bimester: number;
    value: number | null;
  }>;
  skipped: Array<{ studentName: string; reason: string }>;
  pageCount: number;
}

function PdfImportForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [bimester, setBimester] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [policy, setPolicy] = useState<PilotPolicyData | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await siageApi.getPilotPolicy();
        setPolicy(res.data.data);
      } catch { /* policy unavailable — allow all */ }
    })();
  }, []);

  const isBimesterAllowed = (b: number) =>
    !policy || !policy.isRestricted || policy.allowedBimesters.includes(b);

  const handleFileSelect = (f: File) => {
    if (f.type !== 'application/pdf') {
      setError('Apenas arquivos PDF são aceitos.');
      return;
    }
    setFile(f);
    setError('');
    setPreview(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await siageApi.uploadPdf(file, year, bimester);
      setPreview(res.data.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao processar PDF.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setError('');
    try {
      await siageApi.confirmPdfImport({ year, bimester, records: preview.records });
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao confirmar importação.';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>📄 Importar PDF Oficial do SIAGE</h3>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      {/* ── Compliance Banner ── */}
      <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b44', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fbbf24' }}>
        <strong>⚠️ Uso restrito da integração por credenciais</strong><br />
        <span style={{ color: '#d4d4d8' }}>
          A autenticação com credenciais do SIAGE está temporariamente suspensa enquanto se verifica a autorização formal da Secretaria.{' '}
          <strong style={{ color: '#fbbf24' }}>Alternativa recomendada:</strong> exporte o boletim oficial em PDF no SIAGE e importe o arquivo aqui.
        </span>
      </div>

      {policy?.isRestricted && (
        <div style={{ background: '#3b82f622', border: '1px solid #3b82f644', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#93c5fd' }}>
          🔒 <strong>Política do piloto ativa:</strong> apenas o{policy.allowedBimesters.length === 1 ? ` ${policy.allowedBimesters[0]}º` : `s bimestres ${policy.allowedBimesters.join(', ')}`} bimestre{policy.allowedBimesters.length > 1 ? 's estão' : ' está'} habilitado{policy.allowedBimesters.length > 1 ? 's' : ''} nesta fase.
        </div>
      )}

      {/* ── Year + Bimester selectors ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label className="form-label">Ano Letivo</label>
          <select className="form-input" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Bimestre a considerar</label>
          <select className="form-input" value={bimester} onChange={e => setBimester(Number(e.target.value))}>
            {[1, 2, 3, 4].map(b => (
              <option key={b} value={b} disabled={!isBimesterAllowed(b)}>
                {b}º Bimestre{!isBimesterAllowed(b) ? ' (bloqueado pelo piloto)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PDF Upload Area ── */}
      {!preview && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('siage-pdf-upload')?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#3b82f6' : '#555'}`,
              borderRadius: 12,
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? '#3b82f610' : 'transparent',
              transition: 'all 0.2s',
              marginBottom: '1rem',
            }}
          >
            <input
              id="siage-pdf-upload"
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
              {file ? `📄 ${file.name}` : '📁 Arraste o PDF do boletim aqui ou clique para selecionar'}
            </p>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 1rem' }}>
            💡 Exporte o boletim "Geral da turma por componente" no SIAGE e envie o PDF aqui.
          </p>
          <button
            className="btn-primary"
            disabled={!file || uploading || !isBimesterAllowed(bimester)}
            onClick={handleUpload}
            style={{ width: '100%' }}
          >
            {uploading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />Processando PDF...</> : 'Analisar PDF'}
          </button>
        </>
      )}

      {/* ── Preview ── */}
      {preview && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ background: '#10b98118', border: '1px solid #10b98144', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
            <strong style={{ color: '#34d399' }}>✅ PDF processado com sucesso</strong>
            <div style={{ color: '#d4d4d8', marginTop: 4 }}>
              <strong>{preview.header.schoolName}</strong> — {preview.header.turmaEtapa}<br />
              {preview.header.componenteCurricular} · Prof. {preview.header.professor}<br />
              {preview.records.length} notas para importar · {preview.skipped.length} alunos pulados · {preview.pageCount} páginas
            </div>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: '1rem' }}>
            <table className="data-table">
              <thead><tr><th>Aluno</th><th>Nota ({bimester}º Bim)</th><th>Situação</th></tr></thead>
              <tbody>
                {preview.records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.alunoName}</td>
                    <td>{r.value?.toFixed(1) ?? '—'}</td>
                    <td style={{ color: '#10b981', fontSize: '0.82rem' }}>Importar</td>
                  </tr>
                ))}
                {preview.skipped.map((s, i) => (
                  <tr key={`skip-${i}`} style={{ opacity: 0.5 }}>
                    <td>{s.studentName}</td>
                    <td>—</td>
                    <td style={{ fontSize: '0.78rem', color: '#888' }}>{s.reason === 'REMANEJADO' ? 'Remanejado' : 'Sem nota'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => { setPreview(null); setFile(null); }} style={{ flex: 1 }}>
              ← Escolher outro PDF
            </button>
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={confirming || preview.records.length === 0}
              style={{ flex: 2 }}
            >
              {confirming ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />Importando...</> : `Confirmar Importação (${preview.records.length} notas)`}
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '0.85rem' }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}</div>}
    </div>
  );
}


// ─── Resolve Modal ───────────────────────────────────────────────────────────

const RESOLVABLE_STATUSES = ['MANUAL_PENDING', 'UNMATCHED'];

/** Safe label formatter — never crashes on null/undefined */
function formatMatchStatus(status: string | null | undefined): string {
  if (!status) return 'SEM STATUS';
  return status.replace(/_/g, ' ');
}

function ResolveModal({ item, runId, onClose, onResolved }: {
  item: SiageRunItem; runId: string; onClose: () => void; onResolved: () => void;
}) {
  const [alunos, setAlunos] = useState<{ _id: string; name: string }[]>([]);
  const [disciplinas, setDisciplinas] = useState<{ _id: string; name: string }[]>([]);
  const [selectedAluno, setSelectedAluno] = useState(item.matchResult.alunoId || '');
  const [selectedDisciplina, setSelectedDisciplina] = useState(item.matchResult.disciplinaId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [alunoRes, discRes] = await Promise.all([api.get('/alunos'), api.get('/disciplinas')]);
        setAlunos(alunoRes.data.data || []);
        setDisciplinas(discRes.data.data || []);
      } catch { /* empty */ }
      finally { setLoadingData(false); }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!selectedAluno && !selectedDisciplina) { setError('Selecione ao menos um campo para resolver.'); return; }
    setSubmitting(true); setError('');
    try {
      await siageApi.resolveItem(runId, item._id, {
        alunoId: selectedAluno || undefined,
        disciplinaId: selectedDisciplina || undefined,
      });
      onResolved();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao resolver item.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: 480, padding: '1.5rem', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Resolver Item</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} aria-label="Fechar"><X size={20} /></button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <div><strong>Aluno SIAGE:</strong> {item.source.alunoName}</div>
          <div><strong>Disciplina SIAGE:</strong> {item.source.disciplinaName}</div>
          <div><strong>Nota:</strong> {item.source.value != null ? item.source.value.toFixed(1) : '—'}</div>
        </div>
        {loadingData ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Aluno Local</label>
              <select className="form-input" value={selectedAluno} onChange={e => setSelectedAluno(e.target.value)}>
                <option value="">— Selecionar aluno —</option>
                {alunos.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Disciplina Local</label>
              <select className="form-input" value={selectedDisciplina} onChange={e => setSelectedDisciplina(e.target.value)}>
                <option value="">— Selecionar disciplina —</option>
                {disciplinas.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          </>
        )}
        {error && <div style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}</div>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || loadingData} style={{ flex: 1 }}>
            {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 4 }} />Resolvendo...</> : 'Confirmar Resolução'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Promotion Preview Modal ─────────────────────────────────────────────────

interface PromotionPreview {
  totalImportable: number;
  totalNotRegistered: number;
  byDiscipline: Record<string, number>;
  alreadyImported: number;
  pilotBimesterAllowed: boolean;
}

function PromoteModal({ run, onClose, onPromoted }: { run: SiageRun; onClose: () => void; onPromoted: () => void }) {
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; notRegistered: number; errors: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await siageApi.getPromotionPreview(run._id);
        setPreview(res.data.data);
      } catch (err: unknown) {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao carregar preview.');
      } finally { setLoading(false); }
    })();
  }, [run._id]);

  const handlePromote = async () => {
    setPromoting(true); setError('');
    try {
      const res = await siageApi.promoteRun(run._id);
      setResult(res.data.data);
      setTimeout(onPromoted, 2000);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro na promoção.');
    } finally { setPromoting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: 520, padding: '1.5rem', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Promover para Notas</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} aria-label="Fechar"><X size={20} /></button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}

        {result && (
          <div style={{ background: '#10b98122', border: '1px solid #10b98144', borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
            <CheckCircle2 size={32} style={{ color: '#10b981', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: '#10b981' }}>Promoção realizada</div>
            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 4 }}>
              {result.imported} notas escritas | {result.notRegistered} sem nota | {result.errors} erros
            </div>
          </div>
        )}

        {!loading && !result && preview && (
          <>
            {!preview.pilotBimesterAllowed && (
              <div style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 8, padding: '0.6rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fca5a5' }}>
                ⛔ Este run é de um bimestre fora do escopo do piloto. Promoção bloqueada.
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview da promoção:</div>
              <div>📝 Notas a escrever: <strong>{preview.totalImportable}</strong></div>
              <div>📭 Sem nota registrada: {preview.totalNotRegistered}</div>
              <div>✅ Já importadas: {preview.alreadyImported}</div>
              {Object.keys(preview.byDiscipline).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>Por disciplina:</div>
                  {Object.entries(preview.byDiscipline).sort(([,a],[,b]) => b - a).map(([disc, count]) => (
                    <div key={disc} style={{ marginLeft: 12 }}>• {disc}: {count}</div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#f59e0b22', border: '1px solid #f59e0b44', borderRadius: 8, padding: '0.6rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fcd34d' }}>
              ⚠️ <strong>Atenção:</strong> Esta ação escreverá {preview.totalImportable} notas definitivamente na coleção Notas. Esta ação não pode ser desfeita pela interface.
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              Confirmo que revisei os dados e autorizo a promoção
            </label>

            {error && <div style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handlePromote}
                disabled={promoting || !confirmed || !preview.pilotBimesterAllowed || preview.totalImportable === 0}
                style={{ flex: 1, background: confirmed && preview.pilotBimesterAllowed ? '#10b981' : undefined }}
              >
                {promoting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 4 }} />Promovendo...</> : `Promover ${preview.totalImportable} Notas`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Match Rate Helper ───────────────────────────────────────────────────────

function MatchRateBadge({ matched, total }: { matched: number; total: number }) {
  if (total === 0) return null;
  const rate = (matched / total * 100);
  const color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';
  const emoji = rate >= 80 ? '🟢' : rate >= 50 ? '🟡' : '🔴';
  return (
    <span title={`${matched}/${total} auto-matched`} style={{ fontSize: '0.78rem', color, fontWeight: 600 }}>
      {emoji} {rate.toFixed(0)}%
    </span>
  );
}

// ─── DOM Placeholder Check ───────────────────────────────────────────────────

const DOM_PLACEHOLDERS = ['-', 'Nenhum registro foi encontrado', ''];

function isDomPlaceholder(name: string): boolean {
  return DOM_PLACEHOLDERS.includes(name.trim());
}

// ─── Run Detail Panel ────────────────────────────────────────────────────────

function RunDetail({ run, onBack }: { run: SiageRun; onBack: () => void }) {
  const [items, setItems] = useState<SiageRunItem[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [resolvingItem, setResolvingItem] = useState<SiageRunItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPromote, setShowPromote] = useState(false);

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(i => i.source.alunoName.toLowerCase().includes(term));
    }
    return result;
  }, [items, searchTerm]);

  // Computed stats from items
  const itemStats = useMemo(() => {
    const matched = items.filter(i => i.matchResult.matchStatus === 'AUTO_MATCHED').length;
    const unmatched = items.filter(i => i.matchResult.matchStatus === 'UNMATCHED').length;
    const pending = items.filter(i => i.matchResult.matchStatus === 'MANUAL_PENDING').length;
    const placeholders = items.filter(i => isDomPlaceholder(i.source.alunoName)).length;
    return { matched, unmatched, pending, placeholders, total: items.length };
  }, [items]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await siageApi.listItems(run._id, filter || undefined);
      setItems(res.data.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [run._id, filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const matchFilters: { label: string; value: string }[] = [
    { label: 'Todos', value: '' },
    { label: 'Conciliados', value: 'AUTO_MATCHED' },
    { label: 'Pendentes', value: 'MANUAL_PENDING' },
    { label: 'Não encontrados', value: 'UNMATCHED' },
    { label: 'Importados', value: 'IMPORTED' },
    { label: 'Falha', value: 'IMPORT_FAILED' },
  ];

  const matchColors: Record<string, string> = {
    AUTO_MATCHED: '#10b981', MANUAL_PENDING: '#f59e0b', UNMATCHED: '#ef4444',
    RESOLVED: '#3b82f6', IMPORTED: '#10b981', IMPORT_FAILED: '#ef4444',
  };

  const canPromote = run.status === 'COMPLETED' && itemStats.matched > 0;

  return (
    <div className="fade-in">
      <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>← Voltar</button>
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem' }}>
              {run.year} — {run.bimester}º Bim
              {' '}<MatchRateBadge matched={itemStats.matched} total={itemStats.total - itemStats.placeholders} />
            </h3>
            <StatusBadge status={run.status} />
            {run.turmaFilter && run.turmaFilter !== '__ALL__' && <span style={{ marginLeft: 8, color: '#888' }}>Turma: {run.turmaFilter}</span>}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>
            <div>Criado: {new Date(run.createdAt).toLocaleString('pt-BR')}</div>
            <div>Total: {run.stats.total} | Match: {itemStats.matched} | Import: {run.stats.imported} | Erros: {run.stats.errors}</div>
          </div>
        </div>

        {/* Stats bar */}
        {itemStats.total > 0 && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <span style={{ color: '#10b981' }}>✅ Auto-match: {itemStats.matched}</span>
            <span style={{ color: '#ef4444' }}>❌ Não encontrados: {itemStats.unmatched}</span>
            {itemStats.pending > 0 && <span style={{ color: '#f59e0b' }}>⏳ Pendentes: {itemStats.pending}</span>}
            {itemStats.placeholders > 0 && <span style={{ color: '#6b7280' }}>👻 Placeholders DOM: {itemStats.placeholders}</span>}
          </div>
        )}

        {/* Promote button */}
        {canPromote && (
          <button
            className="btn-primary"
            onClick={() => setShowPromote(true)}
            style={{ marginTop: '1rem', background: '#10b981', width: '100%' }}
            id="siage-promote-btn"
          >
            <CheckCircle2 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Promover para Notas ({itemStats.matched} itens matched)
          </button>
        )}

        {run.errorMessage && <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#ef444422', borderRadius: 6, color: '#ef4444', fontSize: '0.85rem' }}>{run.errorMessage}</div>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {matchFilters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={filter === f.value ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>{f.label}</button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: 0 }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              className="form-input"
              placeholder="Buscar por nome do aluno..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 32, width: '100%' }}
              id="siage-item-search"
            />
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Aluno</th><th>Disciplina</th><th>Nota</th><th>Status</th><th>Resolução</th><th>Ação</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Nenhum item encontrado.</td></tr>
            ) : filteredItems.map(item => {
              const isPlaceholder = isDomPlaceholder(item.source.alunoName);
              return (
                <tr key={item._id} style={isPlaceholder ? { opacity: 0.4 } : undefined}>
                  <td>
                    {isPlaceholder ? (
                      <span style={{ fontStyle: 'italic', color: '#6b7280' }}>👻 {item.source.alunoName || '(vazio)'}</span>
                    ) : item.source.alunoName}
                  </td>
                  <td>{item.source.disciplinaName}</td>
                  <td>{item.source.value != null ? item.source.value.toFixed(1) : '—'}</td>
                  <td><span style={{ color: matchColors[item.matchResult.matchStatus] || '#888', fontWeight: 500, fontSize: '0.85rem' }}>{formatMatchStatus(item.matchResult.matchStatus)}</span></td>
                  <td style={{ fontSize: '0.78rem', color: '#888' }}>
                    {item.resolution?.resolvedAt ? (
                      <span title={`Por: ${item.resolution.resolvedBy} | Ação: ${item.resolution.action} | De: ${item.resolution.previousStatus}`}>
                        <UserCheck size={12} style={{ marginRight: 3, verticalAlign: 'middle', color: '#10b981' }} />
                        {new Date(item.resolution.resolvedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : isPlaceholder ? <span style={{ color: '#6b7280' }}>placeholder</span> : '—'}
                  </td>
                  <td>
                    {!isPlaceholder && RESOLVABLE_STATUSES.includes(item.matchResult.matchStatus) && (
                      <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setResolvingItem(item)}>
                        Resolver
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {resolvingItem && (
        <ResolveModal item={resolvingItem} runId={run._id}
          onClose={() => setResolvingItem(null)}
          onResolved={() => { setResolvingItem(null); fetchItems(); }}
        />
      )}

      {showPromote && (
        <PromoteModal run={run}
          onClose={() => setShowPromote(false)}
          onPromoted={() => { setShowPromote(false); fetchItems(); }}
        />
      )}
    </div>
  );
}

// ─── Alias Manager ───────────────────────────────────────────────────────────

function AliasManager() {
  const [aliases, setAliases] = useState<SiageAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSiageName, setNewSiageName] = useState('');
  const [disciplinas, setDisciplinas] = useState<{ _id: string; name: string }[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [creating, setCreating] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  const [autoResult, setAutoResult] = useState<{ created: { siageName: string; disciplinaName: string }[]; skipped: { siageName: string; reason: string }[]; alreadyExisted: string[] } | null>(null);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aliasRes, discRes] = await Promise.all([siageApi.listAliases(), api.get('/disciplinas')]);
      setAliases(aliasRes.data.data || []);
      setDisciplinas(discRes.data.data || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!newSiageName || !selectedDisciplina) return;
    setCreating(true); setError('');
    try {
      await siageApi.createAlias({ siageName: newSiageName, disciplinaId: selectedDisciplina });
      setNewSiageName(''); setSelectedDisciplina('');
      fetchAll();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar alias.');
    } finally { setCreating(false); }
  };

  return (
    <div className="fade-in">
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Novo Alias</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Nome no SIAGE</label>
            <input className="form-input" placeholder="Ex: BIOLOGIA" value={newSiageName} onChange={e => setNewSiageName(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Disciplina Local</label>
            <select className="form-input" value={selectedDisciplina} onChange={e => setSelectedDisciplina(e.target.value)}>
              <option value="">Selecionar...</option>
              {disciplinas.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={creating} style={{ height: 40 }}>
            {creating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Criar'}
          </button>
        </div>
        {error && <div style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.85rem' }}>{error}</div>}
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
          <button
            className="btn-primary"
            onClick={async () => {
              setAutoCreating(true); setError(''); setAutoResult(null);
              try {
                const res = await siageApi.autoCreateAliases();
                setAutoResult(res.data.data);
                fetchAll();
              } catch (err: unknown) {
                setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar aliases automáticos.');
              } finally { setAutoCreating(false); }
            }}
            disabled={autoCreating}
            style={{ width: '100%' }}
          >
            {autoCreating ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />Criando...</> : <><Wand2 size={16} style={{ marginRight: 6 }} />Criar Aliases Automaticamente (match exato)</>}
          </button>
          {autoResult && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ color: '#10b981', marginBottom: 4 }}><strong>Criados ({autoResult.created.length}):</strong></div>
              {autoResult.created.map(c => <div key={c.siageName} style={{ marginLeft: 12 }}>✅ {c.siageName} → {c.disciplinaName}</div>)}
              {autoResult.skipped.length > 0 && <>
                <div style={{ color: '#f59e0b', marginTop: 8, marginBottom: 4 }}><strong>Ignorados ({autoResult.skipped.length}):</strong></div>
                {autoResult.skipped.map(s => <div key={s.siageName} style={{ marginLeft: 12 }}>⚠️ {s.siageName}: {s.reason}</div>)}
              </>}
              {autoResult.alreadyExisted.length > 0 && <>
                <div style={{ color: '#888', marginTop: 8, marginBottom: 4 }}><strong>Já existiam ({autoResult.alreadyExisted.length}):</strong></div>
                {autoResult.alreadyExisted.map(n => <div key={n} style={{ marginLeft: 12 }}>— {n}</div>)}
              </>}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Nome SIAGE</th><th>Disciplina Local</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Carregando...</td></tr>
            ) : aliases.length === 0 ? (
              <tr><td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Nenhum alias configurado.</td></tr>
            ) : aliases.map(a => (
              <tr key={a._id}>
                <td>{a.siageName}</td>
                <td>{a.disciplinaId?.name || <span style={{ color: '#ef4444' }}>Não vinculado</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'runs' | 'aliases';

export default function SiagePage() {
  const [tab, setTab] = useState<Tab>('runs');
  const [runs, setRuns] = useState<SiageRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRun, setSelectedRun] = useState<SiageRun | null>(null);
  const [error, setError] = useState('');
  const [pilotPolicy, setPilotPolicy] = useState<PilotPolicyData | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await siageApi.listRuns();
      setRuns(res.data.data || []);
    } catch { setError('Erro ao carregar execuções.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  useEffect(() => {
    (async () => {
      try {
        const res = await siageApi.getPilotPolicy();
        setPilotPolicy(res.data.data);
      } catch { /* policy unavailable */ }
    })();
  }, []);

  // Auto-refresh for non-terminal runs
  useEffect(() => {
    const hasActive = runs.some(r => !isTerminalStatus(r.status));
    if (!hasActive) return;
    const interval = setInterval(fetchRuns, 8000);
    return () => clearInterval(interval);
  }, [runs, fetchRuns]);

  const handleCancel = async (runId: string) => {
    try { await siageApi.cancelRun(runId); fetchRuns(); } catch { /* */ }
  };

  if (selectedRun) {
    return (
      <>
        <div className="dashboard-header fade-in">
          <h1 className="text-gradient"><ArrowLeftRight size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />SIAGE — Detalhe</h1>
        </div>
        <RunDetail run={selectedRun} onBack={() => { setSelectedRun(null); fetchRuns(); }} />
      </>
    );
  }

  return (
    <>
      <div className="dashboard-header fade-in">
        <h1 className="text-gradient"><ArrowLeftRight size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />Interoperabilidade SIAGE</h1>
        <p className="text-secondary">Sincronização de notas com o sistema SIAGE da Secretaria de Educação</p>
      </div>

      {pilotPolicy?.isRestricted && (
        <div style={{ background: '#3b82f622', border: '1px solid #3b82f644', borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#93c5fd' }} className="fade-in">
          🔒 <strong>Política do piloto ativa:</strong> operações restritas ao{pilotPolicy.allowedBimesters.length === 1 ? ` ${pilotPolicy.allowedBimesters[0]}º bimestre` : `s bimestres ${pilotPolicy.allowedBimesters.join(', ')}`}. Demais bimestres bloqueados por governança de escopo.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }} className="fade-in">
        <button className={tab === 'runs' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('runs')}>Execuções</button>
        <button className={tab === 'aliases' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('aliases')}>Aliases de Disciplina</button>
      </div>

      {tab === 'runs' && (
        <div className="fade-in">
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? <><X size={16} style={{ marginRight: 4 }} />Cancelar</> : <><Plus size={16} style={{ marginRight: 4 }} />📄 Importar PDF</>}
            </button>
            <button className="btn-secondary" onClick={fetchRuns} disabled={loading}>
              <RefreshCw size={16} style={{ marginRight: 4, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />Atualizar
            </button>
          </div>

          {showForm && <div style={{ marginBottom: '1rem' }}><PdfImportForm onCreated={() => { setShowForm(false); fetchRuns(); }} onCancel={() => setShowForm(false)} /></div>}

          {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}</div>}

          {/* Runs table */}
          <div className="glass-panel" style={{ padding: 0 }}>
            <table className="data-table" id="siage-runs-table">
              <thead><tr><th>Ano</th><th>Bimestre</th><th>Status</th><th>Match</th><th>Itens</th><th>Data</th><th>Ações</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></td></tr>
                ) : runs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Nenhuma execução registrada. Clique em "Importar PDF" para começar.</td></tr>
                ) : runs.map(run => (
                  <tr key={run._id}>
                    <td>{run.year}</td>
                    <td>{run.bimester}º</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>{run.stats.total > 0 ? <MatchRateBadge matched={run.stats.matched} total={run.stats.total} /> : '—'}</td>
                    <td>{run.stats.total > 0 ? `${run.stats.imported}/${run.stats.total}` : '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(run.createdAt).toLocaleString('pt-BR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setSelectedRun(run)}>
                          <Search size={12} style={{ marginRight: 2 }} />Detalhes
                        </button>
                        {!isTerminalStatus(run.status) && (
                          <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => handleCancel(run._id)}>
                            <XCircle size={12} style={{ marginRight: 2 }} />Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'aliases' && <AliasManager />}

      {/* CSS for spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
