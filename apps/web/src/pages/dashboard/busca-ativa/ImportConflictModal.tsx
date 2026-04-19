interface ImportConflictModalProps {
  data: Record<string, unknown>;
  onReplace: (importId: string) => void;
  onCancel: () => void;
}

export default function ImportConflictModal({ data, onReplace, onCancel }: ImportConflictModalProps) {
  const existingImport = data.existingImport as {
    id: string;
    version: number;
    date: string;
    casesCreated: number;
    stats?: { totalEntries: number };
  } | undefined;

  if (!existingImport) return null;

  return (
    <div className="ba-modal-overlay" onClick={onCancel}>
      <div className="ba-modal ba-modal--compact" onClick={e => e.stopPropagation()}>
        <div className="ba-modal__header">
          <h2>⚠️ Importação já existe</h2>
          <button className="ba-modal__close" onClick={onCancel}>×</button>
        </div>

        <div className="ba-modal__body">
          <div className="ba-conflict-info">
            <p>Já existe uma importação para esta data:</p>
            <ul>
              <li><strong>Data:</strong> {new Date(existingImport.date).toLocaleDateString('pt-BR')}</li>
              <li><strong>Versão:</strong> v{existingImport.version}</li>
              <li><strong>Casos criados:</strong> {existingImport.casesCreated}</li>
            </ul>
            <div className="ba-conflict-warning">
              <p>⚠️ <strong>Atenção:</strong> Se os casos existentes possuem registro operacional
              (contatos realizados, respostas registradas, anexos), a substituição será <strong>bloqueada</strong>.</p>
              <p>Casos sem atividade operacional serão arquivados (SUPERSEDED) e novos serão criados.</p>
            </div>
          </div>

          <div className="ba-modal__actions ba-modal__actions--spread">
            <button className="ba-btn ba-btn--secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button
              className="ba-btn ba-btn--danger"
              onClick={() => onReplace(existingImport.id)}
            >
              🔄 Substituir Importação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
