import React from 'react';
import { Calendar, Tag, Check, Palette } from 'lucide-react';
import './GoogleCalendarEventConfig.css';

export const GOOGLE_CALENDAR_COLORS = [
  { id: '1', name: 'Lavanda', hex: '#7986cb', emoji: '🟣' },
  { id: '2', name: 'Sálvia', hex: '#33b679', emoji: '🟢' },
  { id: '3', name: 'Uva', hex: '#8e24aa', emoji: '🟣' },
  { id: '4', name: 'Flamingo', hex: '#e67c73', emoji: '🔴' },
  { id: '5', name: 'Banana', hex: '#f6bf26', emoji: '🟡' },
  { id: '6', name: 'Tangerina', hex: '#f4511e', emoji: '🟠' },
  { id: '7', name: 'Pavão', hex: '#039be5', emoji: '🔵' },
  { id: '8', name: 'Grafite', hex: '#616161', emoji: '⚫' },
  { id: '9', name: 'Mirtilo', hex: '#3f51b5', emoji: '🔵' },
  { id: '10', name: 'Manjericão', hex: '#0b8043', emoji: '🟢' },
  { id: '11', name: 'Tomate', hex: '#d50000', emoji: '🔴' }
];

export default function GoogleCalendarEventConfig({
  eventTitle,
  onChangeEventTitle,
  eventDescription,
  onChangeEventDescription,
  eventColorId,
  onChangeEventColorId
}) {
  const selectedColor = GOOGLE_CALENDAR_COLORS.find((c) => c.id === String(eventColorId)) || GOOGLE_CALENDAR_COLORS[8];

  const handleInsertTag = (tag, field) => {
    if (field === 'title') {
      onChangeEventTitle((prev) => (prev ? `${prev} ${tag}` : tag));
    } else {
      onChangeEventDescription((prev) => (prev ? `${prev} ${tag}` : tag));
    }
  };

  return (
    <div className="event-config-card" data-testid="google-calendar-event-config">
      <div className="event-config-header">
        <div className="event-config-title-row">
          <Palette size={18} className="event-config-icon" />
          <h4 className="event-config-title">Personalização do Evento no Google Agenda</h4>
        </div>
        <p className="event-config-subtitle">
          Configure como o evento será criado automaticamente na agenda do expert e enviado como convite por e-mail para o lead.
        </p>
      </div>

      <div className="event-config-body">
        {/* Título do Evento */}
        <div className="event-field-group">
          <div className="event-field-header">
            <label className="event-field-label" htmlFor="calendar-event-title">
              Título do Evento
            </label>
            <div className="event-tags-row">
              <span className="event-tags-label"><Tag size={12} /> Tags:</span>
              <button
                type="button"
                className="event-tag-chip"
                onClick={() => handleInsertTag('{nome}', 'title')}
                title="Inserir tag {nome}"
                data-testid="tag-nome-title"
              >
                + {'{nome}'}
              </button>
              <button
                type="button"
                className="event-tag-chip"
                onClick={() => handleInsertTag('{formulario}', 'title')}
                title="Inserir tag {formulario}"
                data-testid="tag-form-title"
              >
                + {'{formulario}'}
              </button>
            </div>
          </div>
          <input
            id="calendar-event-title"
            type="text"
            className="event-text-input"
            value={eventTitle}
            onChange={(e) => onChangeEventTitle(e.target.value)}
            placeholder="Ex: Reunião com {nome} - {formulario}"
            data-testid="calendar-event-title-input"
          />
        </div>

        {/* Descrição do Evento */}
        <div className="event-field-group">
          <div className="event-field-header">
            <label className="event-field-label" htmlFor="calendar-event-description">
              Descrição / Detalhes do Evento
            </label>
            <div className="event-tags-row">
              <span className="event-tags-label"><Tag size={12} /> Tags:</span>
              <button
                type="button"
                className="event-tag-chip"
                onClick={() => handleInsertTag('{email}', 'desc')}
                title="Inserir tag {email}"
                data-testid="tag-email-desc"
              >
                + {'{email}'}
              </button>
              <button
                type="button"
                className="event-tag-chip"
                onClick={() => handleInsertTag('{telefone}', 'desc')}
                title="Inserir tag {telefone}"
                data-testid="tag-tel-desc"
              >
                + {'{telefone}'}
              </button>
              <button
                type="button"
                className="event-tag-chip"
                onClick={() => handleInsertTag('{respostas}', 'desc')}
                title="Inserir tag {respostas}"
                data-testid="tag-respostas-desc"
              >
                + {'{respostas}'}
              </button>
            </div>
          </div>
          <textarea
            id="calendar-event-description"
            className="event-textarea-input"
            rows={4}
            value={eventDescription}
            onChange={(e) => onChangeEventDescription(e.target.value)}
            placeholder="Ex: Detalhes da reunião, perguntas respondidas e dados de contato..."
            data-testid="calendar-event-description-input"
          />
          <span className="event-field-hint">
            As tags serão preenchidas automaticamente com as respostas reais fornecidas pelo lead.
          </span>
        </div>

        {/* Seletor de Cores da Google Agenda */}
        <div className="event-field-group">
          <label className="event-field-label">
            Cor do Evento no Google Agenda
          </label>
          <div className="event-color-palette" role="radiogroup" aria-label="Cores do Google Agenda">
            {GOOGLE_CALENDAR_COLORS.map((c) => {
              const isSelected = String(eventColorId) === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`color-swatch-btn ${isSelected ? 'active' : ''}`}
                  style={{ '--swatch-color': c.hex }}
                  onClick={() => onChangeEventColorId(c.id)}
                  title={`${c.name} (Cor ${c.id})`}
                  data-testid={`color-swatch-${c.id}`}
                  aria-checked={isSelected}
                  role="radio"
                >
                  <span className="color-swatch-circle" style={{ backgroundColor: c.hex }}>
                    {isSelected && <Check size={14} className="color-check-icon" />}
                  </span>
                  <span className="color-swatch-name">{c.name}</span>
                </button>
              );
            })}
          </div>
          <span className="event-field-hint" style={{ marginTop: '8px', display: 'block' }}>
            O Google Agenda exibe a cor nativa no calendário do expert e o emoji correspondente ({selectedColor.emoji}) no título para que o convidado também visualize a mesma cor na agenda dele.
          </span>
        </div>

        {/* Mini Preview do Card de Evento */}
        <div className="event-mini-preview" data-testid="event-mini-preview">
          <div className="event-mini-badge" style={{ backgroundColor: selectedColor.hex }} />
          <div className="event-mini-info">
            <span className="event-mini-label">Prévia do card no Google Calendar:</span>
            <strong className="event-mini-title">
              {selectedColor.emoji} {eventTitle || 'Reunião sem título'}
            </strong>
            <span className="event-mini-color-tag">Cor: {selectedColor.name} ({selectedColor.emoji})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
