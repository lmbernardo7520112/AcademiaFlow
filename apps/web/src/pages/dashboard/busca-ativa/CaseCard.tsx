import type { BuscaAtivaCase } from '../../../services/buscaAtiva';

interface CaseCardProps {
  caso: BuscaAtivaCase;
  onContactClick: (caso: BuscaAtivaCase, contactId: string) => void;
  onStatusChange: (newStatus: string) => Promise<void>;
  onRefresh: () => void;
}

const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  NOVO: { label: 'Novo', emoji: '🆕', color: '#3b82f6' },
  PENDENTE: { label: 'Pendente', emoji: '⏳', color: '#f59e0b' },
  CONTATO_INICIADO: { label: 'Contato Iniciado', emoji: '📞', color: '#8b5cf6' },
  AGUARDANDO_RESPOSTA: { label: 'Aguardando Resposta', emoji: '⏱️', color: '#f97316' },
  RESPONDIDO: { label: 'Respondido', emoji: '💬', color: '#10b981' },
  JUSTIFICADO: { label: 'Justificado', emoji: '✅', color: '#059669' },
  SEM_RETORNO: { label: 'Sem Retorno', emoji: '🔇', color: '#ef4444' },
  REVISAO_ADMINISTRATIVA: { label: 'Revisão Administrativa', emoji: '📋', color: '#6b7280' },
  TELEFONE_INVALIDO: { label: 'Telefone Inválido', emoji: '❌', color: '#dc2626' },
  ENCERRADO: { label: 'Encerrado', emoji: '✔️', color: '#6b7280' },
  SUPERSEDED: { label: 'Substituído', emoji: '🗄️', color: '#9ca3af' },
};

export default function CaseCard({ caso, onContactClick, onStatusChange }: CaseCardProps) {
  const statusInfo = STATUS_LABELS[caso.status] || { label: caso.status, emoji: '❓', color: '#6b7280' };

  const hasValidContact = caso.contacts.some(c => c.hasValidPhone);
  const attemptCount = caso.timeline.filter(e => e.action === 'CONTACT_ATTEMPT_CONFIRMED').length;

  return (
    <div className="ba-case-card">
      {/* Header */}
      <div className="ba-case-card__header">
        <div className="ba-case-card__aluno">
          <h3>{caso.alunoName}</h3>
          <span className="ba-case-card__turma">{caso.turmaName}</span>
        </div>
        <div
          className="ba-case-card__status"
          style={{ '--status-color': statusInfo.color } as React.CSSProperties}
        >
          <span>{statusInfo.emoji}</span> {statusInfo.label}
        </div>
      </div>

      {/* Flags */}
      <div className="ba-case-card__flags">
        {caso.flags.justified_in_source && (
          <span className="ba-badge ba-badge--justified">Justificado</span>
        )}
        {caso.flags.possible_transfer && (
          <span className="ba-badge ba-badge--transfer">Transferência</span>
        )}
        {caso.flags.unmatched_aluno && (
          <span className="ba-badge ba-badge--warning">Não vinculado</span>
        )}
        {attemptCount > 0 && (
          <span className="ba-badge ba-badge--info">{attemptCount} tentativa(s)</span>
        )}
      </div>

      {/* Contacts */}
      <div className="ba-case-card__contacts">
        {caso.contacts.map(contact => {
          const effectivePhone = contact.correctedPhone || contact.phones[0];
          const phoneValid = effectivePhone?.phoneE164 !== null && effectivePhone?.phoneE164 !== undefined;

          return (
            <div key={contact._id} className="ba-contact-row">
              <div className="ba-contact-row__info">
                <span className="ba-contact-row__role">{contact.role}</span>
                <span className="ba-contact-row__name">{contact.name}</span>
                <span className={`ba-contact-row__phone ${phoneValid ? 'valid' : 'invalid'}`}>
                  📱 {effectivePhone?.phoneRaw || 'Sem telefone'}
                  {phoneValid ? ' ✅' : ' ⚠️'}
                </span>
              </div>
              <button
                className={`ba-btn ba-btn--whatsapp ${!phoneValid ? 'ba-btn--disabled' : ''}`}
                disabled={!phoneValid}
                onClick={() => onContactClick(caso, contact._id)}
                title={phoneValid ? 'Contatar via WhatsApp' : 'Telefone inválido — corrija antes'}
              >
                💬 WhatsApp
              </button>
            </div>
          );
        })}
        {caso.contacts.length === 0 && (
          <p className="ba-contact-row__empty">Nenhum contato disponível</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="ba-case-card__actions">
        {caso.status === 'NOVO' && (
          <>
            {hasValidContact && (
              <button
                className="ba-btn ba-btn--small ba-btn--primary"
                onClick={() => onContactClick(caso, caso.contacts.find(c => c.hasValidPhone)?._id || '')}
              >
                📞 Iniciar Contato
              </button>
            )}
            <button
              className="ba-btn ba-btn--small ba-btn--secondary"
              onClick={() => onStatusChange('PENDENTE')}
            >
              ⏳ Marcar Pendente
            </button>
          </>
        )}
        {caso.status === 'CONTATO_INICIADO' && (
          <button
            className="ba-btn ba-btn--small ba-btn--secondary"
            onClick={() => onStatusChange('AGUARDANDO_RESPOSTA')}
          >
            ⏱️ Aguardando Resposta
          </button>
        )}
        {(caso.status === 'RESPONDIDO' || caso.status === 'JUSTIFICADO') && (
          <button
            className="ba-btn ba-btn--small ba-btn--success"
            onClick={() => onStatusChange('ENCERRADO')}
          >
            ✔️ Encerrar
          </button>
        )}
      </div>

      {/* Timeline Summary */}
      {caso.timeline.length > 1 && (
        <div className="ba-case-card__timeline-hint">
          {caso.timeline.length} registros na timeline
        </div>
      )}
    </div>
  );
}
