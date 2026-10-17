import React, { useState, useEffect } from 'react';
import { History, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import './WebhookLogsSection.css';

export default function WebhookLogsSection({ formId, webhookUrl }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    if (!formId) return;
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/webhook/logs?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Não foi possível carregar os logs de webhook.');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [formId]);

  return (
    <div className="webhook-logs-container" data-testid="webhook-logs-section">
      <div className="webhook-logs-header">
        <div className="webhook-logs-title">
          <History size={16} />
          <h4>Histórico de Disparos de Webhook</h4>
        </div>
        <button
          type="button"
          className="webhook-logs-refresh-btn"
          onClick={fetchLogs}
          disabled={loading}
          data-testid="refresh-webhook-logs-btn"
          title="Atualizar histórico"
        >
          <RefreshCw size={13} className={loading ? 'spinning' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {error && (
        <div className="webhook-logs-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div className="webhook-logs-loading">Carregando histórico de entregas...</div>
      ) : logs.length === 0 ? (
        <div className="webhook-logs-empty" data-testid="webhook-logs-empty">
          Nenhum disparo registrado ainda. Realize um disparo de teste ou preencha o formulário para visualizar os registros de auditoria.
        </div>
      ) : (
        <div className="webhook-logs-list" data-testid="webhook-logs-list">
          {logs.map((log) => (
            <div key={log.id} className="webhook-log-item" data-testid={`webhook-log-item-${log.id}`}>
              <div className="webhook-log-left">
                {log.success ? (
                  <span className="log-status-badge success" title="Entrega bem-sucedida">
                    <CheckCircle2 size={13} /> {log.status_code || 200}
                  </span>
                ) : (
                  <span className="log-status-badge error" title="Falha no disparo">
                    <AlertCircle size={13} /> {log.status_code ? log.status_code : 'Erro'}
                  </span>
                )}
                <span className="webhook-log-url" title={log.webhook_url}>
                  {log.webhook_url}
                </span>
              </div>

              <div className="webhook-log-right">
                {log.duration_ms !== null && log.duration_ms !== undefined && (
                  <span className="webhook-log-duration">
                    <Clock size={11} /> {log.duration_ms}ms
                  </span>
                )}
                <span className="webhook-log-date">{log.created_at}</span>
              </div>

              {log.error_message && (
                <div className="webhook-log-err-desc">
                  <strong>Erro:</strong> {log.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
