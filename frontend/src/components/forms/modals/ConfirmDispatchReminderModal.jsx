import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import './ConfirmDispatchReminderModal.css';

export default function ConfirmDispatchReminderModal({
  isOpen,
  reminder,
  loading,
  onClose,
  onConfirm
}) {
  if (!isOpen || !reminder) return null;

  return (
    <div
      className="dispatch-modal-overlay"
      data-testid="dispatch-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="dispatch-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatch-modal-title"
        data-testid="dispatch-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispatch-modal-icon">
          <Send size={24} />
        </div>

        <h3 id="dispatch-modal-title" className="dispatch-modal-title">
          Disparar Webhook Manualmente?
        </h3>

        <p className="dispatch-modal-desc">
          Ao confirmar, o webhook configurado será acionado imediatamente com as informações deste agendamento.
        </p>

        <div className="dispatch-modal-details">
          <div className="dispatch-detail-row">
            <span>Destinatário:</span>
            <span>{reminder.contact_name || 'Contato'}</span>
          </div>
          {reminder.contact_phone && (
            <div className="dispatch-detail-row">
              <span>Telefone/WhatsApp:</span>
              <span>{reminder.contact_phone}</span>
            </div>
          )}
          <div className="dispatch-detail-row">
            <span>Evento:</span>
            <span>{reminder.reminder_label || reminder.reminder_type}</span>
          </div>
          {reminder.meeting_datetime && (
            <div className="dispatch-detail-row">
              <span>Reunião:</span>
              <span>{reminder.meeting_datetime}</span>
            </div>
          )}
          {reminder.webhook_url && (
            <div className="dispatch-detail-row">
              <span>URL de Envio:</span>
              <span title={reminder.webhook_url}>{reminder.webhook_url}</span>
            </div>
          )}
        </div>

        <div className="dispatch-modal-actions">
          <button
            type="button"
            className="dispatch-modal-cancel-btn"
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-dispatch-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="dispatch-modal-confirm-btn"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-dispatch-btn"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spinner-icon" />
                <span>Disparando...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Confirmar e Disparar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
