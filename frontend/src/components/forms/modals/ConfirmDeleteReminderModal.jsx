import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import './ConfirmDeleteReminderModal.css';

export default function ConfirmDeleteReminderModal({
  isOpen,
  reminder,
  loading,
  onClose,
  onConfirm
}) {
  if (!isOpen || !reminder) return null;

  const dateToDisplay = reminder.scheduled_for_iso || reminder.created_at;

  return (
    <div
      className="delete-reminder-overlay"
      data-testid="delete-reminder-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="delete-reminder-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-reminder-title"
        data-testid="delete-reminder-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-reminder-icon">
          <Trash2 size={24} />
        </div>

        <h3 id="delete-reminder-title" className="delete-reminder-title">
          Excluir Lembrete Agendado?
        </h3>

        <p className="delete-reminder-desc">
          Tem certeza que deseja remover este lembrete da fila? Ele não será disparado para o webhook configurado.
        </p>

        <div className="delete-reminder-details">
          <div className="delete-detail-row">
            <span>Destinatário:</span>
            <span>{reminder.contact_name || 'Contato'}</span>
          </div>
          {reminder.contact_phone && (
            <div className="delete-detail-row">
              <span>Telefone/WhatsApp:</span>
              <span>{reminder.contact_phone}</span>
            </div>
          )}
          <div className="delete-detail-row">
            <span>Evento:</span>
            <span>{reminder.reminder_label || reminder.reminder_type}</span>
          </div>
          {dateToDisplay && (
            <div className="delete-detail-row">
              <span>Data Prevista:</span>
              <span>
                {new Date(dateToDisplay).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        <div className="delete-reminder-actions">
          <button
            type="button"
            className="delete-reminder-cancel-btn"
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-delete-reminder-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="delete-reminder-confirm-btn"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-delete-reminder-btn"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spinner-icon" />
                <span>Excluindo...</span>
              </>
            ) : (
              <span>Sim, Excluir</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
