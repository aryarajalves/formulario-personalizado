import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, CheckCircle2, Check, Loader2 } from 'lucide-react';
import { groupSlotsByInterval } from './calendarSlotUtils';
import './InteractiveBookingCalendar.css';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function InteractiveBookingCalendar({
  formSlug,
  previewSettings,
  value,
  onChange,
  onConfirm,
  onAutoAdvance
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [slotDuration, setSlotDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Se já houver um valor selecionado previamente (ex: ISO string), pré-seleciona a data e horário
  useEffect(() => {
    if (value && typeof value === 'string' && value.includes('T')) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          const dKey = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
          setSelectedDateKey(dKey);
          const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          setSelectedSlot({
            start_iso: value,
            time: timeStr
          });
        }
      } catch (e) {
        // Ignora parse inválido
      }
    }
  }, [value]);

  // Carrega os slots disponíveis para o mês atual
  useEffect(() => {
    let initialSlots = {};

    // Modo pré-visualização ao vivo com configurações locais em tempo real
    if (previewSettings) {
      const {
        workingDays = [1, 2, 3, 4, 5],
        timeRanges = [{ start_time: '09:00', end_time: '18:00' }],
        slotDuration: pDuration = 60,
        bufferMinutes: pBuffer = 0
      } = previewSettings;

      setSlotDuration(pDuration);

      const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
      const newSlotsByDate = {};

      const parsedRanges = (timeRanges || [])
        .map((r) => {
          if (!r?.start_time || !r?.end_time) return null;
          const [sh, sm] = r.start_time.split(':').map(Number);
          const [eh, em] = r.end_time.split(':').map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          return startMin < endMin ? { startMin, endMin } : null;
        })
        .filter(Boolean);

      const now = new Date();

      for (let day = 1; day <= totalDays; day++) {
        const dObj = new Date(currentYear, currentMonth, day);
        const isoDay = dObj.getDay() === 0 ? 7 : dObj.getDay();
        const dateKey = formatDateKey(currentYear, currentMonth, day);
        newSlotsByDate[dateKey] = [];

        if (workingDays.includes(isoDay)) {
          parsedRanges.forEach((range, rangeIdx) => {
            let slotStart = range.startMin;
            while (slotStart + pDuration <= range.endMin) {
              const h = Math.floor(slotStart / 60);
              const m = slotStart % 60;
              const slotDt = new Date(currentYear, currentMonth, day, h, m, 0);

              // Ignora horários passados em relação ao momento atual
              if (slotDt > now) {
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                newSlotsByDate[dateKey].push({
                  time: timeStr,
                  start_iso: `${dateKey}T${timeStr}:00`,
                  range_idx: rangeIdx
                });
              }
              slotStart += pDuration + pBuffer;
            }
          });
        }
      }

      initialSlots = newSlotsByDate;
      setSlotsByDate(newSlotsByDate);

      setSelectedDateKey((prevKey) => {
        if (prevKey && (newSlotsByDate[prevKey] || []).length > 0) {
          return prevKey;
        }
        const firstAvail = Object.keys(newSlotsByDate).find(
          (k) => (newSlotsByDate[k] || []).length > 0
        );
        return firstAvail || '';
      });
    }

    if (!formSlug) return;

    const fetchSlots = async () => {
      try {
        if (!previewSettings) {
          setLoading(true);
        }
        // Calcula primeiro e último dia do mês
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        const startStr = formatDateKey(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate());
        const endStr = formatDateKey(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());

        const res = await fetch(`/api/v1/forms/public/${formSlug}/calendar-slots?start_date=${startStr}&end_date=${endStr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.slot_duration) {
            setSlotDuration(data.settings.slot_duration);
          }

          if (previewSettings && data.busy_intervals && Array.isArray(data.busy_intervals)) {
            // Cruza os turnos de preview com os intervalos ocupados retornados pelo Google
            const duration = previewSettings.slotDuration || 60;
            const filteredPreview = {};
            const busyList = data.busy_intervals.map((b) => ({
              start: new Date(b.start).getTime(),
              end: new Date(b.end).getTime()
            }));

            Object.entries(initialSlots).forEach(([dKey, slots]) => {
              filteredPreview[dKey] = slots.filter((s) => {
                const sStart = new Date(s.start_iso).getTime();
                const sEnd = sStart + duration * 60000;
                const isBusy = busyList.some((b) => Math.max(sStart, b.start) < Math.min(sEnd, b.end));
                return !isBusy;
              });
            });

            setSlotsByDate(filteredPreview);

            setSelectedDateKey((prevKey) => {
              if (prevKey && (filteredPreview[prevKey] || []).length > 0) {
                return prevKey;
              }
              const firstAvail = Object.keys(filteredPreview).find(
                (k) => (filteredPreview[k] || []).length > 0
              );
              return firstAvail || '';
            });
          } else {
            setSlotsByDate(data.slots_by_date || {});

            if (data.slots_by_date) {
              setSelectedDateKey((prevKey) => {
                if (prevKey && (data.slots_by_date[prevKey] || []).length > 0) {
                  return prevKey;
                }
                const firstAvailable = Object.keys(data.slots_by_date).find(
                  (key) => (data.slots_by_date[key] || []).length > 0
                );
                return firstAvailable || '';
              });
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar slots do calendário:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [formSlug, currentYear, currentMonth, JSON.stringify(previewSettings)]);

  const handlePrevMonth = () => {
    const today = new Date();
    // Não permite navegar para meses anteriores ao mês atual
    if (currentYear === today.getFullYear() && currentMonth <= today.getMonth()) {
      return;
    }
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    if (onChange) {
      onChange(slot.start_iso);
    }
  };

  const handleConfirmSlot = () => {
    if (!selectedSlot) return;
    if (onChange) {
      onChange(selectedSlot.start_iso);
    }
    if (onConfirm) {
      onConfirm(selectedSlot.start_iso);
    } else if (onAutoAdvance) {
      onAutoAdvance();
    }
  };

  const handleSelectDay = (dateKey) => {
    if (selectedDateKey !== dateKey) {
      setSelectedDateKey(dateKey);
      setSelectedSlot(null);
      if (onChange) {
        onChange('');
      }
    }
  };

  // Construção da grade mensal
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysGrid = [];
  // Células vazias antes do primeiro dia
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push({ isEmpty: true, key: `empty-${i}` });
  }
  // Dias do mês
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dayDate = new Date(currentYear, currentMonth, day);
    const isPast = dayDate < today;
    const slots = slotsByDate[dateKey] || [];
    const hasAvailable = !isPast && slots.length > 0;
    const isSelected = selectedDateKey === dateKey;

    daysGrid.push({
      isEmpty: false,
      day,
      dateKey,
      isPast,
      hasAvailable,
      isSelected,
      slotsCount: slots.length
    });
  }

  const currentAvailableSlots = selectedDateKey ? slotsByDate[selectedDateKey] || [] : [];
  const slotGroups = groupSlotsByInterval(
    currentAvailableSlots,
    slotDuration,
    previewSettings?.bufferMinutes || 0
  );

  // Formatação amigável da data selecionada
  let formattedSelectedDate = 'Selecione uma data';
  if (selectedDateKey) {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    formattedSelectedDate = dt.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    // Capitaliza primeira letra
    formattedSelectedDate = formattedSelectedDate.charAt(0).toUpperCase() + formattedSelectedDate.slice(1);
  }

  const isPrevDisabled = currentYear === today.getFullYear() && currentMonth <= today.getMonth();

  return (
    <div className="interactive-booking-container" data-testid="interactive-booking-calendar">
      <div className="booking-layout-grid">
        {/* Lado Esquerdo: Calendário Mensal Gigante */}
        <div className="booking-calendar-card">
          <div className="calendar-nav-header">
            <h3 className="calendar-month-title" data-testid="calendar-month-year">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <div className="calendar-nav-buttons">
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={handlePrevMonth}
                disabled={isPrevDisabled}
                aria-label="Mês anterior"
                data-testid="calendar-prev-month-btn"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                data-testid="calendar-next-month-btn"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="calendar-weekdays-row">
            {WEEKDAY_NAMES.map((w) => (
              <div key={w} className="calendar-weekday-cell">
                {w}
              </div>
            ))}
          </div>

          {/* Grade de dias do mês */}
          <div className="calendar-days-grid" role="grid">
            {daysGrid.map((item) => {
              if (item.isEmpty) {
                return <div key={item.key} className="calendar-day-cell empty" />;
              }

              return (
                <button
                  key={item.dateKey}
                  type="button"
                  className={`calendar-day-cell ${item.isSelected ? 'selected' : ''} ${
                    item.hasAvailable ? 'available' : 'unavailable'
                  } ${item.isPast ? 'past' : ''}`}
                  onClick={() => {
                    if (item.hasAvailable) {
                      handleSelectDay(item.dateKey);
                    }
                  }}
                  disabled={!item.hasAvailable}
                  data-testid={`calendar-day-${item.day}`}
                >
                  <span className="day-number">{item.day}</span>
                  {item.hasAvailable && <span className="day-available-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lado Direito: Horários Disponíveis */}
        <div className="booking-slots-card" data-testid="booking-slots-card">
          <div className="slots-header">
            <div className="slots-header-icon-row">
              <Clock size={16} className="slots-header-icon" />
              <span className="slots-header-label">Horários Disponíveis</span>
            </div>
            <h4 className="slots-selected-date" data-testid="selected-date-heading">
              {formattedSelectedDate}
            </h4>
            <span className="slots-duration-badge">
              Duração da Reunião: <strong>{slotDuration} minutos</strong>
            </span>
          </div>

          <div className="slots-content-area">
            {loading ? (
              <div className="slots-loading-state" data-testid="slots-loading">
                <Loader2 className="spinner-icon" size={24} />
                <span>Buscando horários livres...</span>
              </div>
            ) : !selectedDateKey ? (
              <div className="slots-empty-state">
                <CalendarIcon size={32} className="empty-cal-icon" />
                <p>Selecione um dia disponível no calendário para ver os horários de atendimento.</p>
              </div>
            ) : currentAvailableSlots.length === 0 ? (
              <div className="slots-empty-state" data-testid="slots-empty-for-day">
                <Clock size={32} className="empty-cal-icon" />
                <p>Nenhum horário livre disponível nesta data. Por favor, escolha outro dia com vaga.</p>
              </div>
            ) : (
              <div className="slots-groups-container" data-testid="slots-chips-grid">
                {slotGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="slots-interval-group" data-testid={`slots-interval-group-${groupIdx}`}>
                    {groupIdx > 0 && (
                      <div className="slots-interval-divider" data-testid={`slots-interval-divider-${groupIdx}`}>
                        <span className="slots-interval-line" />
                        <span className="slots-interval-badge">Intervalo</span>
                        <span className="slots-interval-line" />
                      </div>
                    )}
                    <div className="slots-chips-grid">
                      {group.map((slot) => {
                        const isSlotSelected = selectedSlot?.start_iso === slot.start_iso;
                        return (
                          <button
                            key={slot.start_iso}
                            type="button"
                            className={`slot-time-btn ${isSlotSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectSlot(slot)}
                            data-testid={`slot-time-btn-${slot.time.replace(':', '-')}`}
                          >
                            <span className="slot-time-text">{slot.time}</span>
                            {isSlotSelected && <CheckCircle2 size={16} className="slot-check-icon" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmação e Ação de Horário Selecionado */}
          {selectedSlot && (
            <div className="selected-slot-action-wrap" data-testid="selected-slot-action-wrap">
              <div className="selected-slot-summary" data-testid="selected-slot-summary">
                <div className="summary-icon-box">
                  <CheckCircle2 size={18} />
                </div>
                <div className="summary-text-wrap">
                  <span className="summary-title">Horário Selecionado</span>
                  <span className="summary-details">
                    {formattedSelectedDate} às <strong>{selectedSlot.time}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="booking-confirm-slot-btn"
                onClick={handleConfirmSlot}
                data-testid="booking-confirm-slot-btn"
              >
                <span>Confirmar Agendamento</span>
                <Check size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
