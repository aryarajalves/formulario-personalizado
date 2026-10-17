import React from 'react';
import { ExternalLink, Calendar, Loader2 } from 'lucide-react';
import WebhookLogsSection from './WebhookLogsSection';

export default function IntegrationsTab({
  formId,
  webhookUrl,
  setWebhookUrl,
  saving,
  testingWebhook,
  googleCalConnected,
  googleCalEmail,
  onSaveWebhook,
  onTestWebhook,
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar
}) {
  return (
    <div className="integrations-view-container" data-testid="integrations-view">
      <div className="integrations-header">
        <h2>Integrações do Formulário</h2>
        <p>Conecte seu formulário com ferramentas externas e envie os dados em tempo real via Webhook.</p>
      </div>

      <div className="integrations-cards-grid">
        {/* Card de Webhook Modernizado */}
        <div className="integration-card active-integration" data-testid="webhook-integration-card">
          <div className="integration-card-header">
            <div className="integration-icon-box webhook-icon-box">
              <ExternalLink size={24} />
            </div>
            <div className="integration-title-wrap">
              <div className="integration-header-row">
                <h3>Webhook (Disparo de Dados)</h3>
                <span className="integration-badge connected">Ativo</span>
              </div>
              <p>Envie os dados de novas respostas preenchidas instantaneamente para o seu CRM, n8n, Make, Zapier ou servidor próprio.</p>
            </div>
          </div>

          <div className="webhook-config-form">
            <div className="webhook-field-group">
              <label className="webhook-field-label">URL do Webhook (Endpoint de Destino)</label>
              <div className="webhook-input-wrapper">
                <div className="webhook-input-prefix">POST</div>
                <input
                  type="url"
                  placeholder="https://sua-plataforma.com/webhook/endpoint"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="webhook-url-input"
                  data-testid="webhook-url-input"
                />
                <button
                  type="button"
                  className="save-webhook-btn"
                  onClick={onSaveWebhook}
                  disabled={saving}
                  data-testid="save-webhook-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="spinner-icon" size={14} />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    'Salvar URL'
                  )}
                </button>
              </div>
              <span className="webhook-field-hint">
                Insira a URL completa (HTTPS recomendada) que irá receber o payload JSON das respostas.
              </span>
            </div>

            <div className="webhook-test-box">
              <div className="webhook-test-info">
                <strong>Testar disparo</strong>
                <span>Envia uma carga de dados simulada para verificar se o seu endpoint está respondendo com sucesso.</span>
              </div>
              <button
                type="button"
                className="test-webhook-btn"
                onClick={onTestWebhook}
                disabled={testingWebhook || !webhookUrl.trim()}
                data-testid="test-webhook-btn"
              >
                {testingWebhook ? (
                  <>
                    <Loader2 className="spinner-icon" size={15} />
                    <span>Disparando teste...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={15} />
                    <span>Disparar Webhook de Teste</span>
                  </>
                )}
              </button>
            </div>

            {/* Histórico e Auditoria de Disparos de Webhook */}
            <WebhookLogsSection formId={formId} webhookUrl={webhookUrl} />
          </div>
        </div>

        {/* Card de Integração: Google Calendar */}
        <div className="integration-card google-cal-integration" data-testid="google-calendar-card">
          <div className="integration-card-header">
            <div className="integration-icon-box google-cal-icon-box">
              <Calendar size={24} />
            </div>
            <div className="integration-title-wrap">
              <div className="integration-header-row">
                <h3>Google Agenda (Google Calendar)</h3>
                <span className={`integration-badge ${googleCalConnected ? 'connected' : 'disconnected'}`}>
                  {googleCalConnected ? 'Conectado' : 'Disponível'}
                </span>
              </div>
              <p>Crie e agende automaticamente compromissos, reuniões e eventos na sua conta Google quando o usuário preencher datas no formulário.</p>
            </div>
          </div>

          <div className="google-cal-config-form">
            <div className="webhook-field-group">
              <label className="webhook-field-label">Autenticação com a Conta Google</label>
              
              {googleCalConnected ? (
                <div className="google-oauth-connected-box">
                  <div className="google-user-info-pill">
                    <span className="google-pill-tag">CONECTADO</span>
                    <span className="google-pill-email" data-testid="google-connected-email">
                      {googleCalEmail || 'Conta Google Ativa'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="save-webhook-btn connected-cal-btn"
                    onClick={onDisconnectGoogleCalendar}
                    data-testid="disconnect-google-cal-btn"
                  >
                    Desconectar Conta
                  </button>
                </div>
              ) : (
                <div className="google-oauth-connect-action">
                  <button
                    type="button"
                    className="google-oauth-login-btn"
                    onClick={onConnectGoogleCalendar}
                    data-testid="connect-google-oauth-btn"
                  >
                    <svg className="google-g-logo" width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Fazer login e conectar com o Google</span>
                  </button>
                </div>
              )}

              <span className="webhook-field-hint">
                {googleCalConnected 
                  ? `Eventos e agendamentos serão criados com sincronia em tempo real na conta: ${googleCalEmail}`
                  : 'Você será redirecionado para a página oficial da Google para autorizar o acesso à sua agenda com total segurança (OAuth 2.0).'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
