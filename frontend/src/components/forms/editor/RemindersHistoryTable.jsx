import React from 'react';
import { 
  RotateCw, 
  Loader2, 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  X,
  Send,
  Edit2,
  Trash2
} from 'lucide-react';
import './RemindersHistoryTable.css';

export default function RemindersHistoryTable({
  remindersList = [],
  loadingReminders = false,
  filterMode = 'all',
  onChangeFilterMode,
  counts = null,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  onRefresh,
  onEdit,
  onDispatch,
  onDelete
}) {
  const filteredList = remindersList.filter((item) => {
    if (filterMode === 'dispatched') return item.status === 'SENT' || item.status === 'FAILED';
    if (filterMode === 'pending') return item.status === 'PENDING';
    return true;
  });

  const displayList = filteredList;

  const totalAll = counts?.all ?? remindersList.length;
  const sentCount = counts?.dispatched ?? remindersList.filter((i) => i.status === 'SENT' || i.status === 'FAILED').length;
  const pendingCount = counts?.pending ?? remindersList.filter((i) => i.status === 'PENDING').length;
  const currentTotal = total || displayList.length;

  return (
    <div className="reminders-history-card" data-testid="reminders-history-card">
      <div className="reminders-history-header">
        <div className="reminders-history-title-wrap">
          <h5>
            <CalendarCheck size={16} color="#2563eb" />
            Histórico de Disparos e Lembretes Agendados
          </h5>
          <span className="reminders-history-subtitle">
            Veja em tempo real se os webhooks foram entregues com sucesso e gerencie os agendamentos na fila.
          </span>
        </div>

        <div className="reminders-header-actions">
          {/* Filtros Rápidos */}
          <div className="reminders-filter-tabs" role="tablist">
            <button
              type="button"
              className={`reminders-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => onChangeFilterMode('all')}
              data-testid="filter-reminders-all"
            >
              Todos ({totalAll})
            </button>
            <button
              type="button"
              className={`reminders-filter-btn ${filterMode === 'dispatched' ? 'active' : ''}`}
              onClick={() => onChangeFilterMode('dispatched')}
              data-testid="filter-reminders-dispatched"
            >
              Disparados ({sentCount})
            </button>
            <button
              type="button"
              className={`reminders-filter-btn ${filterMode === 'pending' ? 'active' : ''}`}
              onClick={() => onChangeFilterMode('pending')}
              data-testid="filter-reminders-pending"
            >
              Agendados ({pendingCount})
            </button>
          </div>

          <button
            type="button"
            className="reminders-refresh-btn"
            onClick={onRefresh}
            disabled={loadingReminders}
            data-testid="refresh-reminders-btn"
            title="Recarregar histórico de disparos"
          >
            {loadingReminders ? <Loader2 size={12} className="spinner-icon" /> : <RotateCw size={12} />}
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {displayList.length === 0 ? (
        <div className="reminders-empty-box" data-testid="reminders-empty">
          {filterMode === 'dispatched'
            ? 'Nenhum webhook foi disparado ainda. Você pode disparar manualmente ou aguardar os horários programados.'
            : filterMode === 'pending'
            ? 'Nenhum lembrete na fila de agendamento no momento.'
            : 'Nenhum registro encontrado. Assim que um respondente marcar uma reunião ou você disparar um teste, os eventos aparecerão listados aqui.'}
        </div>
      ) : (
        <div className="reminders-table-wrapper" data-testid="reminders-table-wrapper">
          <table className="reminders-table">
            <thead>
              <tr>
                <th>Data e Hora</th>
                <th>Evento / Tipo</th>
                <th>Destinatário</th>
                <th>Status do Envio</th>
                <th>Detalhes do Retorno</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((item, idx) => {
                const isSent = item.status === 'SENT';
                const isFailed = item.status === 'FAILED';
                const dateToDisplay = item.sent_at || item.scheduled_for_iso || item.created_at;

                return (
                  <tr key={item.id || idx} data-testid={`reminder-row-${idx}`}>
                    {/* Data e Hora */}
                    <td className="col-reminder-date">
                      <div className="reminder-time-cell">
                        <Clock size={13} className="text-muted" />
                        <span>
                          {dateToDisplay ? new Date(dateToDisplay).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </span>
                      </div>
                      <span className="reminder-timing-label">
                        {isSent || isFailed ? 'Disparado' : 'Previsto'}
                      </span>
                    </td>

                    {/* Tipo de Lembrete */}
                    <td>
                      <span className={`reminder-type-tag ${item.reminder_type || 'morning'}`}>
                        {item.reminder_type === 'test' ? (
                          '🧪 Teste Manual'
                        ) : item.reminder_type === 'morning' ? (
                          `☀️ ${item.reminder_label || 'Lembrete Matinal'}`
                        ) : (
                          `⏰ ${item.reminder_label || 'Antecedência'}`
                        )}
                      </span>
                      {item.meeting_datetime && (
                        <div className="reminder-meeting-date">
                          Reunião: {item.meeting_datetime}
                        </div>
                      )}
                    </td>

                    {/* Destinatário */}
                    <td>
                      <strong>{item.contact_name || 'Contato'}</strong>
                      {item.contact_phone && (
                        <div className="contact-subtext">{item.contact_phone}</div>
                      )}
                      {item.contact_email && !item.contact_phone && (
                        <div className="contact-subtext">{item.contact_email}</div>
                      )}
                    </td>

                    {/* Status & Código HTTP */}
                    <td>
                      <span className={`reminder-status-badge ${item.status?.toLowerCase() || 'pending'}`}>
                        {isSent ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Sucesso {item.status_code ? `(${item.status_code} OK)` : ''}</span>
                          </>
                        ) : isFailed ? (
                          <>
                            <AlertCircle size={12} />
                            <span>Falha {item.status_code ? `(HTTP ${item.status_code})` : ''}</span>
                          </>
                        ) : (
                          <>
                            <Clock size={12} />
                            <span>Aguardando Horário</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Detalhes / Motivo */}
                    <td className="col-reminder-details">
                      {isSent ? (
                        <span className="reminder-detail-success">
                          <Check size={12} />
                          Entregue com sucesso à URL
                        </span>
                      ) : isFailed ? (
                        <span className="reminder-detail-error" title={item.error_message || 'Erro no disparo'}>
                          <X size={12} />
                          {item.error_message || 'Erro ao conectar ao webhook de destino.'}
                        </span>
                      ) : (
                        <span className="reminder-detail-pending">
                          Disparo programado automaticamente
                        </span>
                      )}
                    </td>

                    {/* Coluna de Ações */}
                    <td className="col-reminder-actions" style={{ textAlign: 'right' }}>
                      <div className="reminder-actions-row">
                        {/* 1. Botão Disparar Manualmente (com popup) */}
                        <button
                          type="button"
                          className="reminder-action-btn dispatch-action-btn"
                          onClick={() => onDispatch(item)}
                          title="Disparar webhook manualmente agora"
                          data-testid={`dispatch-reminder-btn-${item.id || idx}`}
                        >
                          <Send size={12} />
                          <span>Disparar</span>
                        </button>

                        {/* 2. Botão Editar Informações */}
                        <button
                          type="button"
                          className="reminder-action-btn edit-action-btn"
                          onClick={() => onEdit(item)}
                          title="Atualizar data/hora e informações do destinatário"
                          data-testid={`edit-reminder-btn-${item.id || idx}`}
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* 3. Botão Excluir Lembrete */}
                        <button
                          type="button"
                          className="reminder-action-btn delete-action-btn"
                          onClick={() => onDelete(item)}
                          title="Excluir lembrete da fila"
                          data-testid={`delete-reminder-btn-${item.id || idx}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Rodapé de Paginação (20 itens por página) */}
          <div className="reminders-pagination-footer" data-testid="reminders-pagination">
            <div className="reminders-pagination-info">
              Mostrando <strong>{displayList.length}</strong> de <strong>{currentTotal}</strong> {currentTotal === 1 ? 'lembrete' : 'lembretes'} (20 por página)
            </div>
            <div className="reminders-pagination-buttons">
              <button
                type="button"
                className="reminders-pagination-nav-btn"
                disabled={page <= 1 || loadingReminders}
                onClick={() => onPageChange && onPageChange(page - 1)}
                data-testid="pagination-prev-btn"
              >
                Anterior
              </button>
              <span className="reminders-pagination-page-indicator" data-testid="pagination-page-indicator">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="reminders-pagination-nav-btn"
                disabled={page >= totalPages || loadingReminders}
                onClick={() => onPageChange && onPageChange(page + 1)}
                data-testid="pagination-next-btn"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
