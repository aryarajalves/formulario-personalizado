import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Save, 
  Loader2, 
  Palette,
  CalendarCheck2,
  Bell
} from 'lucide-react';
import CalendarLivePreview from './CalendarLivePreview';
import GoogleCalendarEventConfig from './GoogleCalendarEventConfig';
import GoogleCalendarBookingsList from './GoogleCalendarBookingsList';
import GoogleCalendarRemindersConfig from './GoogleCalendarRemindersConfig';
import GoogleCalendarScheduleConfig, {
  DAYS_OF_WEEK,
  DURATION_OPTIONS,
  TIME_OPTIONS,
  BUFFER_OPTIONS
} from './GoogleCalendarScheduleConfig';
import { useToast } from '../../../context/ToastContext';
import './GoogleCalendarSettings.css';

// Re-exporta para manter retrocompatibilidade com testes e outros componentes
export { DAYS_OF_WEEK, DURATION_OPTIONS, TIME_OPTIONS, BUFFER_OPTIONS };

export default function GoogleCalendarSettings({ 
  formId, 
  formSlug, 
  googleCalConnected, 
  googleCalEmail,
  formWebhookUrl
}) {
  let addToast = () => {};
  try {
    const toast = useToast();
    if (toast?.addToast) addToast = toast.addToast;
  } catch (e) {
    // Fallback gracioso caso renderizado fora de ToastProvider em testes
  }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('horarios'); // 'horarios' | 'evento' | 'previa' | 'agendamentos' | 'lembretes'

  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]);
  const [timeRanges, setTimeRanges] = useState([
    { start_time: '09:00', end_time: '18:00' }
  ]);
  const [slotDuration, setSlotDuration] = useState(60);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [eventTitle, setEventTitle] = useState('Reunião com {nome} - {formulario}');
  const [eventDescription, setEventDescription] = useState(
    "Agendamento confirmado através do formulário '{formulario}'.\n\nDados do Cliente:\n- Nome: {nome}\n- E-mail: {email}\n- Telefone: {telefone}\n\nRespostas do Formulário:\n{respostas}"
  );
  const [eventColorId, setEventColorId] = useState('9');
  const [reminderMorningEnabled, setReminderMorningEnabled] = useState(true);
  const [reminderMorningTime, setReminderMorningTime] = useState('09:00');
  const [reminderBeforeEnabled, setReminderBeforeEnabled] = useState(true);
  const [reminderBeforeMinutes, setReminderBeforeMinutes] = useState(30);
  const [reminderWebhookUrl, setReminderWebhookUrl] = useState('');
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  useEffect(() => {
    if (formId) {
      fetchSettings();
    }
  }, [formId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        if (s.working_days) setWorkingDays(s.working_days);
        if (s.time_ranges && Array.isArray(s.time_ranges) && s.time_ranges.length > 0) {
          setTimeRanges(s.time_ranges);
        } else if (s.start_time || s.end_time) {
          setTimeRanges([{
            start_time: s.start_time || '09:00',
            end_time: s.end_time || '18:00'
          }]);
        }
        if (s.slot_duration !== undefined) setSlotDuration(Number(s.slot_duration));
        if (s.buffer_minutes !== undefined) setBufferMinutes(Number(s.buffer_minutes));
        if (s.event_title) setEventTitle(s.event_title);
        if (s.event_description) setEventDescription(s.event_description);
        if (s.event_color_id) setEventColorId(String(s.event_color_id));
        if (s.reminder_morning_enabled !== undefined) setReminderMorningEnabled(Boolean(s.reminder_morning_enabled));
        if (s.reminder_morning_time) setReminderMorningTime(s.reminder_morning_time);
        if (s.reminder_before_enabled !== undefined) setReminderBeforeEnabled(Boolean(s.reminder_before_enabled));
        if (s.reminder_before_minutes !== undefined) setReminderBeforeMinutes(Number(s.reminder_before_minutes));
        if (s.reminder_webhook_url !== undefined) setReminderWebhookUrl(s.reminder_webhook_url);
      }
    } catch (err) {
      // Falha silenciosa de carregamento inicial mantendo defaults
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayId) => {
    setWorkingDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) {
          addToast('Selecione pelo menos um dia da semana para atendimento.', 'warning');
          return prev;
        }
        return prev.filter((d) => d !== dayId);
      }
      return [...prev, dayId].sort((a, b) => a - b);
    });
  };

  const handleAddRange = () => {
    const lastRange = timeRanges[timeRanges.length - 1];
    let newStart = '14:00';
    let newEnd = '18:00';

    if (lastRange) {
      const lastEndIdx = TIME_OPTIONS.indexOf(lastRange.end_time);
      if (lastEndIdx !== -1 && lastEndIdx + 2 < TIME_OPTIONS.length) {
        newStart = TIME_OPTIONS[lastEndIdx + 2];
        newEnd = TIME_OPTIONS[Math.min(lastEndIdx + 6, TIME_OPTIONS.length - 1)];
      }
    }

    setTimeRanges((prev) => [...prev, { start_time: newStart, end_time: newEnd }]);
  };

  const handleRemoveRange = (index) => {
    if (timeRanges.length <= 1) {
      addToast('Mantenha pelo menos um período de atendimento configurado.', 'warning');
      return;
    }
    setTimeRanges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRangeChange = (index, field, value) => {
    setTimeRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const hasInvalidRange = timeRanges.some((r) => r.start_time >= r.end_time);

  const handleSaveSettings = async () => {
    if (hasInvalidRange) {
      addToast('Em cada turno, o horário de término precisa ser posterior ao de início.', 'error');
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      const payload = {
        working_days: workingDays,
        time_ranges: timeRanges,
        start_time: timeRanges[0]?.start_time || '09:00',
        end_time: timeRanges[timeRanges.length - 1]?.end_time || '18:00',
        slot_duration: slotDuration,
        buffer_minutes: bufferMinutes,
        event_title: eventTitle,
        event_description: eventDescription,
        event_color_id: eventColorId,
        reminder_morning_enabled: reminderMorningEnabled,
        reminder_morning_time: reminderMorningTime,
        reminder_before_enabled: reminderBeforeEnabled,
        reminder_before_minutes: reminderBeforeMinutes,
        reminder_webhook_url: reminderWebhookUrl
      };

      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Não foi possível salvar as configurações de atendimento.');
      }

      addToast('Configurações salvas com sucesso!', 'success');
      setPreviewRefreshKey((k) => k + 1);
    } catch (err) {
      addToast(err.message || 'Erro ao salvar configurações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="expert-schedule-config-box" data-testid="expert-schedule-config">
      <div className="expert-schedule-header">
        <div className="expert-schedule-title-row">
          <Clock size={18} className="expert-schedule-icon" />
          <h4>Configurações da Google Agenda</h4>
        </div>
        <p>
          Organize seus horários de atendimento, personalize o evento e confira a prévia do calendário para seus respondentes.
        </p>
      </div>

      {loading ? (
        <div className="expert-schedule-loading">
          <Loader2 className="spinner-icon" size={20} />
          <span>Carregando configurações...</span>
        </div>
      ) : (
        <div className="expert-schedule-body">
          {/* Navegação por Sub-abas */}
          <div className="calendar-subtabs-nav" role="tablist" aria-label="Abas da integração Google Agenda">
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'horarios'}
              className={`calendar-subtab-btn ${activeSubTab === 'horarios' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('horarios')}
              data-testid="subtab-horarios-btn"
            >
              <Clock size={15} />
              <span>Horários e Turnos</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'evento'}
              className={`calendar-subtab-btn ${activeSubTab === 'evento' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('evento')}
              data-testid="subtab-evento-btn"
            >
              <Palette size={15} />
              <span>Personalização do Evento</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'previa'}
              className={`calendar-subtab-btn ${activeSubTab === 'previa' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('previa')}
              data-testid="subtab-previa-btn"
            >
              <CalendarIcon size={15} />
              <span>Prévia do Calendário</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'agendamentos'}
              className={`calendar-subtab-btn ${activeSubTab === 'agendamentos' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('agendamentos')}
              data-testid="subtab-agendamentos-btn"
            >
              <CalendarCheck2 size={15} />
              <span>Agendamentos</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'lembretes'}
              className={`calendar-subtab-btn ${activeSubTab === 'lembretes' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('lembretes')}
              data-testid="subtab-lembretes-btn"
            >
              <Bell size={15} />
              <span>Lembretes</span>
            </button>
          </div>

          {/* Conteúdo da Sub-aba: Horários e Turnos */}
          {activeSubTab === 'horarios' && (
            <div className="calendar-subtab-pane" data-testid="tab-pane-horarios">
              <GoogleCalendarScheduleConfig
                workingDays={workingDays}
                onToggleDay={handleToggleDay}
                timeRanges={timeRanges}
                onAddRange={handleAddRange}
                onRemoveRange={handleRemoveRange}
                onRangeChange={handleRangeChange}
                slotDuration={slotDuration}
                onChangeSlotDuration={setSlotDuration}
                bufferMinutes={bufferMinutes}
                onChangeBufferMinutes={setBufferMinutes}
              />

              <div className="schedule-save-row">
                <button
                  type="button"
                  className="save-schedule-btn"
                  onClick={handleSaveSettings}
                  disabled={saving || hasInvalidRange}
                  data-testid="save-schedule-settings-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="spinner-icon" size={16} />
                      <span>Salvando Horários...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Salvar Horários de Atendimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Conteúdo da Sub-aba: Personalização do Evento */}
          {activeSubTab === 'evento' && (
            <div className="calendar-subtab-pane" data-testid="tab-pane-evento">
              <GoogleCalendarEventConfig
                eventTitle={eventTitle}
                onChangeEventTitle={setEventTitle}
                eventDescription={eventDescription}
                onChangeEventDescription={setEventDescription}
                eventColorId={eventColorId}
                onChangeEventColorId={setEventColorId}
              />

              <div className="schedule-save-row">
                <button
                  type="button"
                  className="save-schedule-btn"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  data-testid="save-event-settings-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="spinner-icon" size={16} />
                      <span>Salvando Evento...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Salvar Configurações do Evento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Conteúdo da Sub-aba: Prévia do Calendário */}
          {activeSubTab === 'previa' && (
            <div className="calendar-subtab-pane" data-testid="tab-pane-previa">
              <CalendarLivePreview
                formSlug={formSlug}
                previewSettings={{
                  workingDays,
                  timeRanges,
                  slotDuration,
                  bufferMinutes
                }}
                refreshKey={previewRefreshKey}
                onRefresh={() => setPreviewRefreshKey((k) => k + 1)}
              />
            </div>
          )}

          {/* Conteúdo da Sub-aba: Agendamentos Realizados */}
          {activeSubTab === 'agendamentos' && (
            <div className="calendar-subtab-pane" data-testid="tab-pane-agendamentos">
              <GoogleCalendarBookingsList
                formId={formId}
                googleCalConnected={googleCalConnected}
                googleCalEmail={googleCalEmail}
              />
            </div>
          )}

          {/* Conteúdo da Sub-aba: Lembretes e Webhooks Agendados */}
          {activeSubTab === 'lembretes' && (
            <div className="calendar-subtab-pane" data-testid="tab-pane-lembretes">
              <GoogleCalendarRemindersConfig
                formId={formId}
                formWebhookUrl={formWebhookUrl}
                reminderMorningEnabled={reminderMorningEnabled}
                onChangeReminderMorningEnabled={setReminderMorningEnabled}
                reminderMorningTime={reminderMorningTime}
                onChangeReminderMorningTime={setReminderMorningTime}
                reminderBeforeEnabled={reminderBeforeEnabled}
                onChangeReminderBeforeEnabled={setReminderBeforeEnabled}
                reminderBeforeMinutes={reminderBeforeMinutes}
                onChangeReminderBeforeMinutes={setReminderBeforeMinutes}
                reminderWebhookUrl={reminderWebhookUrl}
                onChangeReminderWebhookUrl={setReminderWebhookUrl}
              />

              <div className="schedule-save-row">
                <button
                  type="button"
                  className="save-schedule-btn"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  data-testid="save-reminders-settings-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="spinner-icon" size={16} />
                      <span>Salvando Lembretes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Salvar Configurações de Lembrete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
