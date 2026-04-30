import { useState } from 'react';
import type { BuscaAtivaCase } from '../../../services/buscaAtiva';
import { buscaAtivaApi } from '../../../services/buscaAtiva';

interface WhatsAppModalProps {
  caso: BuscaAtivaCase;
  contactId: string;
  onClose: () => void;
}

type ModalStep = 'prepare' | 'confirm' | 'done';

/**
 * 4-step WhatsApp contact flow:
 * 1. MESSAGE_PREPARED (auto) — modal opens with template
 * 2. WHATSAPP_OPENED (auto) — wa.me link opened
 * 3. CONTACT_ATTEMPT_CONFIRMED (manual) — operator confirms
 * 4. Status auto-transition if applicable
 */
export default function WhatsAppModal({ caso, contactId, onClose }: WhatsAppModalProps) {
  const contact = caso.contacts.find(c => c._id === contactId);
  const effectivePhone = contact?.correctedPhone || contact?.phones[0];
  const phoneE164 = effectivePhone?.phoneE164;

  const schoolWhatsApp = import.meta.env.VITE_SCHOOL_WHATSAPP_NUMBER || '83 9821-1221';

  const defaultMessage = `Prezado(a) ${contact?.name || 'Responsável'},

Informamos que o(a) aluno(a) *${caso.alunoName}*, da turma *${caso.turmaName}*, não compareceu à aula no dia *${new Date(caso.date).toLocaleDateString('pt-BR')}*.

Solicitamos gentilmente que entre em contato com a secretaria da escola pelo WhatsApp *${schoolWhatsApp}* para informar o motivo da falta.

Atenciosamente,
Secretaria Escolar`;

  const [messageText, setMessageText] = useState(defaultMessage);
  const [step, setStep] = useState<ModalStep>('prepare');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Record MESSAGE_PREPARED and open wa.me
  const handleOpenWhatsApp = async () => {
    if (!phoneE164) return;
    setLoading(true);
    try {
      // Timeline: MESSAGE_PREPARED
      await buscaAtivaApi.addTimelineEntry(caso._id, {
        action: 'MESSAGE_PREPARED',
        contactId,
        messageText,
      });

      const encodedMessage = encodeURIComponent(messageText);
      const waUrl = `https://wa.me/${phoneE164}?text=${encodedMessage}`;

      // Timeline: WHATSAPP_OPENED
      await buscaAtivaApi.addTimelineEntry(caso._id, {
        action: 'WHATSAPP_OPENED',
        contactId,
        phoneUsed: phoneE164,
        waUrl,
      });

      // Open WhatsApp in new tab
      window.open(waUrl, '_blank');

      setStep('confirm');
    } catch (err) {
      console.error('Erro ao abrir WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Confirm or deny send
  const handleConfirm = async (outcome: 'sent' | 'failed') => {
    setLoading(true);
    try {
      await buscaAtivaApi.addTimelineEntry(caso._id, {
        action: 'CONTACT_ATTEMPT_CONFIRMED',
        contactId,
        channel: 'whatsapp_manual',
        outcome,
        phoneUsed: phoneE164 || undefined,
        notes: notes || undefined,
      });
      setStep('done');
    } catch (err) {
      console.error('Erro ao confirmar contato:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ba-modal-overlay" onClick={onClose}>
      <div className="ba-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ba-modal__header">
          <h2>💬 Contato via WhatsApp</h2>
          <button className="ba-modal__close" onClick={onClose}>×</button>
        </div>

        {/* Contact Info */}
        <div className="ba-modal__contact-info">
          <p><strong>Aluno:</strong> {caso.alunoName} — {caso.turmaName}</p>
          <p><strong>Contato:</strong> {contact?.role}: {contact?.name}</p>
          <p><strong>Telefone:</strong> {effectivePhone?.phoneRaw} {phoneE164 ? '✅' : '⚠️'}</p>
        </div>

        {/* Step 1: Prepare */}
        {step === 'prepare' && (
          <div className="ba-modal__body">
            <label htmlFor="ba-whatsapp-message" className="ba-label">
              Mensagem (edite se necessário):
            </label>
            <textarea
              id="ba-whatsapp-message"
              className="ba-textarea ba-textarea--compact"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              rows={10}
            />
            <div className="ba-modal__actions">
              <button className="ba-btn ba-btn--secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="ba-btn ba-btn--whatsapp"
                onClick={handleOpenWhatsApp}
                disabled={!phoneE164 || loading}
              >
                {loading ? '⏳ Abrindo...' : '📱 Abrir no WhatsApp'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && (
          <div className="ba-modal__body">
            <div className="ba-modal__confirm-prompt">
              <h3>Você conseguiu enviar a mensagem no WhatsApp?</h3>
              <textarea
                className="ba-textarea ba-textarea--compact"
                placeholder="Observações (opcional)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="ba-modal__actions ba-modal__actions--spread">
              <button
                className="ba-btn ba-btn--success"
                onClick={() => handleConfirm('sent')}
                disabled={loading}
              >
                ✅ Sim, enviei
              </button>
              <button
                className="ba-btn ba-btn--danger"
                onClick={() => handleConfirm('failed')}
                disabled={loading}
              >
                ❌ Não consegui
              </button>
              <button
                className="ba-btn ba-btn--secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="ba-modal__body ba-modal__body--done">
            <div className="ba-modal__done-icon">✅</div>
            <p>Tentativa de contato registrada com sucesso.</p>
            <button className="ba-btn ba-btn--primary" onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
