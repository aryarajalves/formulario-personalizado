import React from 'react';
import { Plus, Trash2, Check, Clock } from 'lucide-react';

export const DAYS_OF_WEEK = [
  { id: 1, label: 'Seg', full: 'Segunda-feira' },
  { id: 2, label: 'Ter', full: 'Terça-feira' },
  { id: 3, label: 'Qua', full: 'Quarta-feira' },
  { id: 4, label: 'Qui', full: 'Quinta-feira' },
  { id: 5, label: 'Sex', full: 'Sexta-feira' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
  { id: 7, label: 'Dom', full: 'Domingo' },
];

export const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '60 minutos (Padrão)' },
  { value: 90, label: '1h 30m (90 min)' },
  { value: 120, label: '2 horas (120 min)' },
];

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

export const BUFFER_OPTIONS = [
  { value: 0, label: 'Sem intervalo (0 min)' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
];

export default function GoogleCalendarScheduleConfig({
  workingDays,
  onToggleDay,
  timeRanges,
  onAddRange,
  onRemoveRange,
  onRangeChange,
  slotDuration,
  onChangeSlotDuration,
  bufferMinutes,
  onChangeBufferMinutes
}) {
  return (
    <div className="schedule-config-tab-content" data-testid="google-calendar-schedule-config">
      {/* Dias da Semana */}
      <div className="schedule-field-group">
        <label className="schedule-field-label">Dias da Semana Disponíveis</label>
        <div className="schedule-days-grid" role="group" aria-label="Dias da semana">
          {DAYS_OF_WEEK.map((d) => {
            const isSelected = workingDays.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                className={`schedule-day-chip ${isSelected ? 'active' : ''}`}
                onClick={() => onToggleDay(d.id)}
                title={d.full}
                data-testid={`day-chip-${d.id}`}
              >
                {isSelected && <Check size={13} className="day-check-icon" />}
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>
        <span className="schedule-field-hint">
          Clique para ativar ou desativar os dias em que haverá atendimento.
        </span>
      </div>

      {/* Múltiplos Intervalos / Turnos de Horários */}
      <div className="schedule-field-group">
        <div className="schedule-field-label-row">
          <label className="schedule-field-label">Horários de Atendimento (Turnos e Intervalos)</label>
          <button
            type="button"
            className="add-timerange-btn"
            onClick={onAddRange}
            data-testid="add-timerange-btn"
          >
            <Plus size={14} />
            <span>Adicionar intervalo / turno</span>
          </button>
        </div>

        <div className="time-ranges-list" data-testid="time-ranges-list">
          {timeRanges.map((range, index) => {
            const isRangeInvalid = range.start_time >= range.end_time;
            return (
              <div key={index} className="time-range-row" data-testid={`time-range-row-${index}`}>
                <div className="time-range-row-inner">
                  <div className="time-range-index-badge">
                    <span>Turno {index + 1}</span>
                  </div>
                  
                  <div className="time-range-inputs">
                    <div className="time-select-wrap">
                      <span className="time-select-label">Das</span>
                      <select
                        value={range.start_time}
                        onChange={(e) => onRangeChange(index, 'start_time', e.target.value)}
                        className="schedule-select-input"
                        data-testid={`range-start-${index}`}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="time-select-wrap">
                      <span className="time-select-label">às</span>
                      <select
                        value={range.end_time}
                        onChange={(e) => onRangeChange(index, 'end_time', e.target.value)}
                        className={`schedule-select-input ${isRangeInvalid ? 'invalid' : ''}`}
                        data-testid={`range-end-${index}`}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {timeRanges.length > 1 && (
                      <button
                        type="button"
                        className="remove-timerange-btn"
                        onClick={() => onRemoveRange(index)}
                        title="Remover este turno"
                        data-testid={`remove-range-${index}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {isRangeInvalid && (
                  <span className="schedule-field-error" data-testid={`range-error-${index}`}>
                    O horário de término precisa ser posterior ao horário de início.
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <span className="schedule-field-hint">
          Adicione períodos de atendimento. Exemplo: das 09:00 às 12:00 e das 15:00 às 20:00 (o intervalo das 12:00 às 15:00 fica como pausa/almoço).
        </span>
      </div>

      {/* Duração e Buffer */}
      <div className="schedule-two-cols">
        <div className="schedule-field-group">
          <label className="schedule-field-label" htmlFor="expert-slot-duration">
            Duração de cada Reunião
          </label>
          <select
            id="expert-slot-duration"
            className="schedule-select-input"
            value={slotDuration}
            onChange={(e) => onChangeSlotDuration(Number(e.target.value))}
            data-testid="expert-duration-select"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="schedule-field-group">
          <label className="schedule-field-label" htmlFor="expert-buffer-minutes">
            Intervalo entre Atendimentos (Buffer)
          </label>
          <select
            id="expert-buffer-minutes"
            className="schedule-select-input"
            value={bufferMinutes}
            onChange={(e) => onChangeBufferMinutes(Number(e.target.value))}
            data-testid="expert-buffer-select"
          >
            {BUFFER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
