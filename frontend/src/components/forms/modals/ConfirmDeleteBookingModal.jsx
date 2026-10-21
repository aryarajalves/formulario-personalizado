import React from 'react';
import { Trash2, Loader2, Calendar, User, Phone, Mail } from 'lucide-react';
import './ConfirmDeleteBookingModal.css';

export default function ConfirmDeleteBookingModal({
  isOpen,
  booking,
  loading,
  onClose,
  onConfirm
}) {
  if (!isOpen || !booking) return null;

  return (
    <div
      className="delete-booking-overlay"
      data-testid="delete-booking-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="delete-booking-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-booking-title"
        data-testid="delete-booking-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-booking-icon">
          <Trash2 size={24} />
        </div>

        <h3 id="delete-booking-title" className="delete-booking-title">
          Excluir Agendamento?
        </h3>

        <p className="delete-booking-desc">
          Tem certeza que deseja cancelar e excluir este agendamento? Esta ação removerá a resposta do formulário, cancelará o evento na sua Google Agenda e apagará todos os lembretes programados.
        </p>

        <div className="delete-booking-details">
          <div className="delete-booking-row">
            <span>Data e Horário:</span>
            <span>{booking.formatted_datetime || booking.scheduled_iso}</span>
          </div>
          <div className="delete-booking-row">
            <span>Lead / Contato:</span>
            <span>{booking.contact_name || 'Anônimo'}</span>
          </div>
          {booking.contact_email && (
            <div className="delete-booking-row">
              <span>E-mail:</span>
              <span>{booking.contact_email}</span>
            </div>
          )}
          {booking.contact_phone && (
            <div className="delete-booking-row">
              <span>Telefone/WhatsApp:</span>
              <span>{booking.contact_phone}</span>
            </div>
          )}
        </div>

        <div className="delete-booking-actions">
          <button
            type="button"
            className="delete-booking-cancel-btn"
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-delete-booking-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="delete-booking-confirm-btn"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-delete-booking-btn"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spinner-icon" />
                <span>Excluindo...</span>
              </>
            ) : (
              <span>Sim, Cancelar e Excluir</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
