import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import InteractiveBookingCalendar from '../calendar/InteractiveBookingCalendar';
import './CalendarLivePreview.css';

export default function CalendarLivePreview({ formSlug, previewSettings, refreshKey, onRefresh }) {
  if (!formSlug) return null;

  return (
    <div className="calendar-live-preview-box" data-testid="calendar-live-preview">
      <div className="calendar-live-preview-header">
        <div className="preview-title-group">
          <div className="preview-title-row">
            <Calendar size={18} className="preview-calendar-icon" />
            <h5 className="preview-heading">Pré-visualização do Calendário (Tempo Real)</h5>
          </div>
          <span className="preview-status-pill">Atualização ao vivo</span>
        </div>

        <button
          type="button"
          className="preview-refresh-btn"
          onClick={onRefresh}
          title="Recarregar prévia dos horários"
          data-testid="preview-refresh-btn"
        >
          <RefreshCw size={13} />
          <span>Atualizar Prévia</span>
        </button>
      </div>

      <p className="preview-explanation">
        Veja abaixo exatamente como os turnos e os intervalos de atendimento configurados acima aparecerão
        para quem estiver respondendo ao seu formulário.
      </p>

      <div className="preview-calendar-wrapper" data-testid="preview-calendar-wrapper">
        <InteractiveBookingCalendar
          key={refreshKey}
          formSlug={formSlug}
          previewSettings={previewSettings}
          value=""
          onChange={() => {}}
          onConfirm={() => {}}
        />
      </div>
    </div>
  );
}
