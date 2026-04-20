import { useState, useRef } from 'react';
import type { BuscaAtivaCase } from '../../../services/buscaAtiva';
import { buscaAtivaApi } from '../../../services/buscaAtiva';

interface ResponseModalProps {
  caso: BuscaAtivaCase;
  onClose: () => void;
}

type ModalStep = 'form' | 'done';

/**
 * ResponseModal — allows the operator to:
 * 1. Paste the WhatsApp response text from the parent
 * 2. Choose a resolution type (responded, justified with medical cert, etc.)
 * 3. Optionally attach a document (atestado médico)
 * 4. Optionally add notes
 *
 * This records RESPONSE_RECEIVED in the timeline, optionally uploads
 * an attachment, and transitions the case status to RESPONDIDO or JUSTIFICADO.
 */
export default function ResponseModal({ caso, onClose }: ResponseModalProps) {
  const [step, setStep] = useState<ModalStep>('form');
  const [responseText, setResponseText] = useState('');
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState<'responded' | 'justified'>('responded');
  const [resolutionType, setResolutionType] = useState('justified');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the contact that was most recently contacted
  const lastContactEntry = [...caso.timeline]
    .reverse()
    .find(e => e.action === 'CONTACT_ATTEMPT_CONFIRMED');
  const contactId = lastContactEntry?.contactId || caso.contacts[0]?._id || '';
  const contact = caso.contacts.find(c => c._id === contactId) || caso.contacts[0];

  const handleSubmit = async () => {
    if (!responseText.trim()) {
      setError('Cole o texto da resposta recebida.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Record RESPONSE_RECEIVED in timeline
      await buscaAtivaApi.addTimelineEntry(caso._id, {
        action: 'RESPONSE_RECEIVED',
        contactId: contactId || undefined,
        responseText: responseText.trim(),
        notes: notes.trim() || undefined,
        resolutionType: resolution === 'justified' ? resolutionType : undefined,
        justification: resolution === 'justified' ? responseText.trim() : undefined,
      });

      // 2. Upload attachment if present
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', `Documento: ${file.name}`);

        const response = await fetch(
          `/api/busca-ativa/cases/${caso._id}/attachments`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('Upload failed:', errData);
          // Non-blocking: attachment upload failure shouldn't block status change
        }
      }

      // 3. Transition status
      const newStatus = resolution === 'justified' ? 'JUSTIFICADO' : 'RESPONDIDO';
      await buscaAtivaApi.updateCaseStatus(caso._id, newStatus);

      setStep('done');
    } catch (err) {
      console.error('Erro ao registrar resposta:', err);
      setError('Erro ao registrar resposta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ba-modal-overlay" onClick={onClose}>
      <div className="ba-modal ba-modal--wide" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ba-modal__header">
          <h2>💬 Registrar Resposta do Responsável</h2>
          <button className="ba-modal__close" onClick={onClose}>×</button>
        </div>

        {step === 'form' && (
          <div className="ba-modal__body">
            {/* Context */}
            <div className="ba-modal__context">
              <p><strong>Aluno:</strong> {caso.alunoName} — {caso.turmaName}</p>
              {contact && (
                <p><strong>Contato:</strong> {contact.role}: {contact.name}</p>
              )}
            </div>

            {/* Response text (paste from WhatsApp) */}
            <label className="ba-label" htmlFor="response-text">
              Resposta recebida (cole do WhatsApp):
            </label>
            <textarea
              id="response-text"
              className="ba-textarea ba-textarea--compact"
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder='Ex: "Ok, ele ficou doente. Vou levar atestado amanhã."'
              rows={4}
            />

            {/* Resolution type */}
            <fieldset className="ba-fieldset">
              <legend className="ba-legend">Resolução:</legend>
              <label className="ba-radio-label">
                <input
                  type="radio"
                  name="resolution"
                  value="responded"
                  checked={resolution === 'responded'}
                  onChange={() => setResolution('responded')}
                />
                <span className="ba-radio-text">💬 Respondido — aguarda avaliação</span>
              </label>
              <label className="ba-radio-label">
                <input
                  type="radio"
                  name="resolution"
                  value="justified"
                  checked={resolution === 'justified'}
                  onChange={() => setResolution('justified')}
                />
                <span className="ba-radio-text">✅ Justificado — falta justificada</span>
              </label>
            </fieldset>

            {/* If justified, show reason type */}
            {resolution === 'justified' && (
              <div className="ba-form-group">
                <label className="ba-label" htmlFor="resolution-type">Tipo de justificativa:</label>
                <select
                  id="resolution-type"
                  className="ba-select"
                  value={resolutionType}
                  onChange={e => setResolutionType(e.target.value)}
                >
                  <option value="justified">Justificativa genérica</option>
                  <option value="medical">Atestado médico</option>
                  <option value="family_issue">Problema familiar</option>
                  <option value="transportation">Transporte</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            )}

            {/* File attachment */}
            <div className="ba-form-group">
              <label className="ba-label">Anexar documento (opcional):</label>
              <div className="ba-file-picker">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <button
                  className="ba-btn ba-btn--secondary ba-btn--small"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  📎 {file ? file.name : 'Escolher arquivo...'}
                </button>
                {file && (
                  <button
                    className="ba-btn ba-btn--ghost ba-btn--small"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    type="button"
                  >
                    ✕ Remover
                  </button>
                )}
              </div>
              <p className="ba-hint">PDF, JPG, PNG ou WebP. Máx 5MB.</p>
            </div>

            {/* Notes */}
            <label className="ba-label" htmlFor="response-notes">
              Observações adicionais (opcional):
            </label>
            <textarea
              id="response-notes"
              className="ba-textarea ba-textarea--compact"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Mãe ligou e justificou por telefone."
              rows={2}
            />

            {/* Error */}
            {error && (
              <div className="ba-banner ba-banner--error" role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* Actions */}
            <div className="ba-modal__actions">
              <button className="ba-btn ba-btn--secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="ba-btn ba-btn--primary"
                onClick={handleSubmit}
                disabled={loading || !responseText.trim()}
              >
                {loading ? '⏳ Registrando...' : '✅ Registrar Resposta'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="ba-modal__body ba-modal__done">
            <div className="ba-modal__context">
              <p><strong>Aluno:</strong> {caso.alunoName} — {caso.turmaName}</p>
              {contact && <p><strong>Contato:</strong> {contact.role}: {contact.name}</p>}
            </div>
            <div className="ba-done-icon">✅</div>
            <p className="ba-done-text">
              Resposta registrada com sucesso.
              <br />
              Status: <strong>{resolution === 'justified' ? 'Justificado' : 'Respondido'}</strong>
            </p>
            <div className="ba-modal__actions">
              <button className="ba-btn ba-btn--primary" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
