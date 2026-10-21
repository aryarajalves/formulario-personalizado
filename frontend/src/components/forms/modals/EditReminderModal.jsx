import React, { useState, useEffect } from 'react';
import { Edit2, Loader2, Calendar, User, Phone, Check } from 'lucide-react';
import './EditReminderModal.css';

export default function EditReminderModal({
  isOpen,
  reminder,
  loading,
  onClose,
  onSave
}) {
  const [scheduledFor, setScheduledFor] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (reminder) {
      setContactName(reminder.contact_name || '');
      setContactPhone(reminder.contact_phone || '');

      // Converte ISO em formato datetime-local (YYYY-MM-DDTHH:mm)
      const rawDate = reminder.scheduled_for_iso || reminder.created_at;
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          const pad = (n) => String(n).padStart(2, '0');
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setScheduledFor(localIso);
        } catch {
          setScheduledFor('');
        }
      } else {
        setScheduledFor('');
      }
    }
  }, [reminder, isOpen]);

  if (!isOpen || !reminder) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      contact_name: contactName,
      contact_phone: contactPhone
    });
  };

  return (
    <div
      className="reminder-modal-overlay"
      data-testid="edit-reminder-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="reminder-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-reminder-title"
        data-testid="edit-reminder-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reminder-modal-header">
          <div className="reminder-modal-icon">
            <Edit2 size={20} />
          </div>
          <div className="reminder-modal-title-wrap">
            <h3 id="edit-reminder-title">Editar Informações do Lembrete</h3>
            <p>Atualize a data/hora do disparo e os dados do destinatário.</p>
          </div>
        </div>

        {reminder.meeting_datetime && (
          <div className="reminder-modal-info-badge">
            <span><strong>Reunião:</strong> {reminder.meeting_datetime}</span>
            <span><strong>Tipo:</strong> {reminder.reminder_label || reminder.reminder_type}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="reminder-modal-form-group">
            <label htmlFor="edit-scheduled-for">
              <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
              Data e Horário Previsto para o Disparo:
            </label>
            <input
              id="edit-scheduled-for"
              type="datetime-local"
              className="reminder-modal-input"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              required
              data-testid="input-edit-scheduled-for"
            />
          </div>

          <div className="reminder-modal-form-group">
            <label htmlFor="edit-contact-name">
              <User size={13} style={{ display: 'inline', marginRight: 4 }} />
              Nome do Destinatário:
            </label>
            <input
              id="edit-contact-name"
              type="text"
              className="reminder-modal-input"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ex: Nome do Cliente"
              required
              data-testid="input-edit-contact-name"
            />
          </div>

          <div className="reminder-modal-form-group">
            <label htmlFor="edit-contact-phone">
              <Phone size={13} style={{ display: 'inline', marginRight: 4 }} />
              Telefone / WhatsApp:
            </label>
            <input
              id="edit-contact-phone"
              type="text"
              className="reminder-modal-input"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Ex: +55 85 99999-8888"
              data-testid="input-edit-contact-phone"
            />
          </div>

          <div className="reminder-modal-actions">
            <button
              type="button"
              className="reminder-modal-cancel-btn"
              onClick={onClose}
              disabled={loading}
              data-testid="cancel-edit-reminder-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="reminder-modal-submit-btn"
              disabled={loading}
              data-testid="save-edit-reminder-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spinner-icon" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
