import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Sun, 
  Clock, 
  Send, 
  Loader2, 
  Sparkles,
  Link2
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import RemindersHistoryTable from './RemindersHistoryTable';
import EditReminderModal from '../modals/EditReminderModal';
import ConfirmDispatchReminderModal from '../modals/ConfirmDispatchReminderModal';
import ConfirmDeleteReminderModal from '../modals/ConfirmDeleteReminderModal';
import './GoogleCalendarRemindersConfig.css';

const MORNING_HOURS = [
  { value: '07:00', label: '07:00 da manhã' },
  { value: '08:00', label: '08:00 da manhã' },
  { value: '09:00', label: '09:00 da manhã (Padrão)' },
  { value: '10:00', label: '10:00 da manhã' },
  { value: '11:00', label: '11:00 da manhã' },
  { value: '12:00', label: '12:00 (Meio-dia)' }
];

const BEFORE_MINUTES = [
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes (Padrão)' },
  { value: 45, label: '45 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' }
];

export default function GoogleCalendarRemindersConfig({
  formId,
  formWebhookUrl,
  reminderMorningEnabled,
  onChangeReminderMorningEnabled,
  reminderMorningTime,
  onChangeReminderMorningTime,
  reminderBeforeEnabled,
  onChangeReminderBeforeEnabled,
  reminderBeforeMinutes,
  onChangeReminderBeforeMinutes,
  reminderWebhookUrl,
  onChangeReminderWebhookUrl
}) {
  const [remindersList, setRemindersList] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [filterMode, setFilterMode] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReminders, setTotalReminders] = useState(0);
  const [counts, setCounts] = useState({ all: 0, dispatched: 0, pending: 0 });

  // Estados dos Modais
  const [editingReminder, setEditingReminder] = useState(null);
  const [dispatchingReminder, setDispatchingReminder] = useState(null);
  const [deletingReminder, setDeletingReminder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const fetchReminders = async (targetPage = page, mode = filterMode) => {
    if (!formId) return;
    try {
      setLoadingReminders(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/reminders?page=${targetPage}&limit=20&status_filter=${mode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRemindersList(data.reminders || []);
        setTotalReminders(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setPage(data.page || targetPage);
        setCounts({
          all: data.total_all ?? (data.total || 0),
          dispatched: data.total_dispatched ?? 0,
          pending: data.total_pending ?? 0
        });
      }
    } catch {
      // Falha silenciosa
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleChangeFilterMode = (newMode) => {
    setFilterMode(newMode);
    setPage(1);
    fetchReminders(1, newMode);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || loadingReminders) return;
    fetchReminders(newPage, filterMode);
  };

  useEffect(() => {
    setPage(1);
    fetchReminders(1, 'all');
  }, [formId]);

  const handleTestReminder = async (type = 'morning') => {
    const targetUrl = (reminderWebhookUrl || formWebhookUrl || '').trim();
    if (!targetUrl) {
      addToast('Configure uma URL de webhook para poder testar o disparo.', 'warning');
      return;
    }

    try {
      setTestingWebhook(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/reminders/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          webhook_url: targetUrl,
          reminder_type: type
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao testar webhook de lembrete.');
      }

      addToast('Webhook de teste enviado com sucesso! Verifique a resposta abaixo.', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao testar lembrete.', 'error');
    } finally {
      setTestingWebhook(false);
      fetchReminders(page, filterMode);
    }
  };

  // 1. Atualizar informações do lembrete (PATCH)
  const handleSaveEdit = async (updatedData) => {
    if (!editingReminder) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/reminders/${editingReminder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao atualizar informações do lembrete.');
      }

      addToast('Informações do lembrete atualizadas com sucesso!', 'success');
      setEditingReminder(null);
      fetchReminders(page, filterMode);
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar lembrete.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Disparar Manualmente (POST .../dispatch)
  const handleConfirmDispatch = async () => {
    if (!dispatchingReminder) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/reminders/${dispatchingReminder.id}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao disparar webhook.');
      }

      if (data.success) {
        addToast(`Webhook disparado com sucesso! (Status: ${data.status_code || 200})`, 'success');
      } else {
        addToast(`Falha no envio: ${data.error_message || 'Erro desconhecido'}`, 'error');
      }

      setDispatchingReminder(null);
      fetchReminders(page, filterMode);
    } catch (err) {
      addToast(err.message || 'Erro ao disparar webhook.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Excluir Lembrete (DELETE)
  const handleConfirmDelete = async () => {
    if (!deletingReminder) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/reminders/${deletingReminder.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao excluir lembrete.');
      }

      addToast('Lembrete excluído com sucesso!', 'success');
      setDeletingReminder(null);
      fetchReminders(page, filterMode);
    } catch (err) {
      addToast(err.message || 'Erro ao excluir lembrete.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="reminders-config-container" data-testid="google-calendar-reminders-config">
      {/* Apresentação */}
      <div className="reminders-intro-card">
        <h4>
          <Bell size={18} color="#2563eb" />
          Lembretes e Disparos de Webhook
        </h4>
        <p>
          Configure lembretes automáticos para notificar sua plataforma de automação (n8n, Zapier, Z-API, Typebot, ManyChat) 
          tanto no dia do agendamento quanto minutos antes da reunião começar.
        </p>
      </div>

      {/* Grid de Configurações de Lembrete */}
      <div className="reminders-grid">
        {/* 1. Lembrete Matinal no Dia da Reunião */}
        <div className={`reminder-item-card ${reminderMorningEnabled ? 'enabled' : ''}`}>
          <div className="reminder-card-header">
            <div className="reminder-header-info">
              <div className="reminder-icon-box">
                <Sun size={18} />
              </div>
              <div>
                <h5>Lembrete no Dia da Reunião</h5>
                <p>Dispara um webhook na manhã do dia agendado avisando que a reunião acontece hoje.</p>
              </div>
            </div>

            <label className="reminder-toggle-label" title="Ativar/Desativar lembrete no dia">
              <input
                type="checkbox"
                checked={reminderMorningEnabled}
                onChange={(e) => onChangeReminderMorningEnabled(e.target.checked)}
                data-testid="toggle-reminder-morning"
              />
              <span className="reminder-toggle-slider"></span>
            </label>
          </div>

          {reminderMorningEnabled && (
            <div className="reminder-settings-row">
              <label htmlFor="reminder-morning-time">Horário do disparo matinal:</label>
              <select
                id="reminder-morning-time"
                className="reminder-select"
                value={reminderMorningTime || '09:00'}
                onChange={(e) => onChangeReminderMorningTime(e.target.value)}
                data-testid="select-reminder-morning-time"
              >
                {MORNING_HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <div className="reminder-event-badge">
                <Sparkles size={12} color="#2563eb" />
                <span>Evento enviado: <code>booking_reminder_morning</code></span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Lembrete de Antecedência Imediata */}
        <div className={`reminder-item-card ${reminderBeforeEnabled ? 'enabled' : ''}`}>
          <div className="reminder-card-header">
            <div className="reminder-header-info">
              <div className="reminder-icon-box">
                <Clock size={18} />
              </div>
              <div>
                <h5>Lembrete Pouco Antes da Reunião</h5>
                <p>Dispara um webhook minutos antes do início para enviar o link da sala ou lembrete final.</p>
              </div>
            </div>

            <label className="reminder-toggle-label" title="Ativar/Desativar lembrete de antecedência">
              <input
                type="checkbox"
                checked={reminderBeforeEnabled}
                onChange={(e) => onChangeReminderBeforeEnabled(e.target.checked)}
                data-testid="toggle-reminder-before"
              />
              <span className="reminder-toggle-slider"></span>
            </label>
          </div>

          {reminderBeforeEnabled && (
            <div className="reminder-settings-row">
              <label htmlFor="reminder-before-minutes">Tempo de antecedência:</label>
              <select
                id="reminder-before-minutes"
                className="reminder-select"
                value={reminderBeforeMinutes || 30}
                onChange={(e) => onChangeReminderBeforeMinutes(Number(e.target.value))}
                data-testid="select-reminder-before-minutes"
              >
                {BEFORE_MINUTES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="reminder-event-badge">
                <Sparkles size={12} color="#2563eb" />
                <span>Evento enviado: <code>booking_reminder_before_meeting</code></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. URL de Destino do Webhook de Lembrete */}
      <div className="reminder-webhook-card">
        <h5>
          <Link2 size={16} color="#2563eb" />
          URL do Webhook para Lembretes
        </h5>
        <p>
          Opcional: Informe uma URL dedicada para receber apenas os lembretes ou deixe em branco para usar o webhook padrão do formulário.
        </p>

        <div className="webhook-input-row">
          <input
            type="url"
            className="reminder-webhook-input"
            placeholder={formWebhookUrl ? `Usando webhook principal: ${formWebhookUrl}` : 'https://seu-servico-ou-n8n.com/webhook/lembrete'}
            value={reminderWebhookUrl || ''}
            onChange={(e) => onChangeReminderWebhookUrl(e.target.value)}
            data-testid="input-reminder-webhook-url"
          />

          <button
            type="button"
            className="test-reminder-btn"
            onClick={() => handleTestReminder('morning')}
            disabled={testingWebhook || (!reminderWebhookUrl && !formWebhookUrl)}
            data-testid="test-reminder-webhook-btn"
            title="Enviar uma carga JSON de teste para a URL de webhook"
          >
            {testingWebhook ? (
              <>
                <Loader2 size={14} className="spinner-icon" />
                <span>Enviando Teste...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Testar Disparo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Tabela de Histórico e Agendamentos com Ações */}
      <RemindersHistoryTable
        remindersList={remindersList}
        loadingReminders={loadingReminders}
        filterMode={filterMode}
        onChangeFilterMode={handleChangeFilterMode}
        counts={counts}
        page={page}
        totalPages={totalPages}
        total={totalReminders}
        onPageChange={handlePageChange}
        onRefresh={() => fetchReminders(page, filterMode)}
        onEdit={(item) => setEditingReminder(item)}
        onDispatch={(item) => setDispatchingReminder(item)}
        onDelete={(item) => setDeletingReminder(item)}
      />

      {/* Modal 1: Editar Informações do Lembrete */}
      <EditReminderModal
        isOpen={Boolean(editingReminder)}
        reminder={editingReminder}
        loading={actionLoading}
        onClose={() => setEditingReminder(null)}
        onSave={handleSaveEdit}
      />

      {/* Modal 2: Confirmação de Disparo Manual de Webhook */}
      <ConfirmDispatchReminderModal
        isOpen={Boolean(dispatchingReminder)}
        reminder={dispatchingReminder}
        loading={actionLoading}
        onClose={() => setDispatchingReminder(null)}
        onConfirm={handleConfirmDispatch}
      />

      {/* Modal 3: Confirmação de Exclusão de Lembrete */}
      <ConfirmDeleteReminderModal
        isOpen={Boolean(deletingReminder)}
        reminder={deletingReminder}
        loading={actionLoading}
        onClose={() => setDeletingReminder(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
