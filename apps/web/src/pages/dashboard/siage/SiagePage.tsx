import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, X, Search, ArrowLeftRight, AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
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

// ─── Create Run Form ─────────────────────────────────────────────────────────

function CreateRunForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [bimester, setBimester] = useState(1);
  const [turmaFilter, setTurmaFilter] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Credenciais SIAGE são obrigatórias.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await siageApi.createRun({
        year, bimester,
        turmaFilter: turmaFilter || undefined,
        credentials: { username, password },
      });
      // Clear credentials from memory immediately
      setPassword('');
      setUsername('');
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar sincronização.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Nova Sincronização SIAGE</h3>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Ano Letivo</label>
            <select className="form-input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Bimestre</label>
            <select className="form-input" value={bimester} onChange={e => setBimester(Number(e.target.value))}>
              {[1, 2, 3, 4].map(b => <option key={b} value={b}>{b}º Bimestre</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Turma (opcional)</label>
            <input className="form-input" placeholder="Ex: 1ª Série A" value={turmaFilter} onChange={e => setTurmaFilter(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Usuário SIAGE</label>
            <input className="form-input" placeholder="CPF ou login" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="form-label">Senha SIAGE</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 1rem' }}>
          ⚠️ As credenciais são usadas apenas para esta sincronização e não são armazenadas.
        </p>
        {error && <div style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}</div>}
        <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />Criando...</> : 'Iniciar Sincronização'}
        </button>
      </form>
    </div>
  );
}

// ─── Resolve Modal ───────────────────────────────────────────────────────────

const RESOLVABLE_STATUSES = ['MANUAL_PENDING', 'UNMATCHED'];

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

// ─── Run Detail Panel ────────────────────────────────────────────────────────

function RunDetail({ run, onBack }: { run: SiageRun; onBack: () => void }) {
  const [items, setItems] = useState<SiageRunItem[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [resolvingItem, setResolvingItem] = useState<SiageRunItem | null>(null);

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

  return (
    <div className="fade-in">
      <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>← Voltar</button>
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem' }}>{run.year} — {run.bimester}º Bim</h3>
            <StatusBadge status={run.status} />
            {run.turmaFilter && run.turmaFilter !== '__ALL__' && <span style={{ marginLeft: 8, color: '#888' }}>Turma: {run.turmaFilter}</span>}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>
            <div>Criado: {new Date(run.createdAt).toLocaleString('pt-BR')}</div>
            <div>Total: {run.stats.total} | Match: {run.stats.matched} | Import: {run.stats.imported} | Erros: {run.stats.errors}</div>
          </div>
        </div>
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
        <table className="data-table">
          <thead><tr><th>Aluno</th><th>Disciplina</th><th>Nota</th><th>Status</th><th>Ação</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Nenhum item encontrado.</td></tr>
            ) : items.map(item => (
              <tr key={item._id}>
                <td>{item.source.alunoName}</td>
                <td>{item.source.disciplinaName}</td>
                <td>{item.source.value != null ? item.source.value.toFixed(1) : '—'}</td>
                <td><span style={{ color: matchColors[item.matchResult.status] || '#888', fontWeight: 500, fontSize: '0.85rem' }}>{item.matchResult.status.replace(/_/g, ' ')}</span></td>
                <td>
                  {RESOLVABLE_STATUSES.includes(item.matchResult.status) && (
                    <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setResolvingItem(item)}>
                      Resolver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolvingItem && (
        <ResolveModal item={resolvingItem} runId={run._id}
          onClose={() => setResolvingItem(null)}
          onResolved={() => { setResolvingItem(null); fetchItems(); }}
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

  const fetchRuns = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await siageApi.listRuns();
      setRuns(res.data.data || []);
    } catch { setError('Erro ao carregar execuções.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

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
              {showForm ? <><X size={16} style={{ marginRight: 4 }} />Cancelar</> : <><Plus size={16} style={{ marginRight: 4 }} />Nova Sincronização</>}
            </button>
            <button className="btn-secondary" onClick={fetchRuns} disabled={loading}>
              <RefreshCw size={16} style={{ marginRight: 4, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />Atualizar
            </button>
          </div>

          {showForm && <div style={{ marginBottom: '1rem' }}><CreateRunForm onCreated={() => { setShowForm(false); fetchRuns(); }} onCancel={() => setShowForm(false)} /></div>}

          {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}</div>}

          {/* Runs table */}
          <div className="glass-panel" style={{ padding: 0 }}>
            <table className="data-table" id="siage-runs-table">
              <thead><tr><th>Ano</th><th>Bimestre</th><th>Status</th><th>Itens</th><th>Data</th><th>Ações</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></td></tr>
                ) : runs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Nenhuma execução registrada. Clique em "Nova Sincronização" para começar.</td></tr>
                ) : runs.map(run => (
                  <tr key={run._id}>
                    <td>{run.year}</td>
                    <td>{run.bimester}º</td>
                    <td><StatusBadge status={run.status} /></td>
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
