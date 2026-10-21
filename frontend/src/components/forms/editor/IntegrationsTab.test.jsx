import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IntegrationsTab from './IntegrationsTab';
import { ToastProvider } from '../../../context/ToastContext';

describe('IntegrationsTab Component - Google Calendar Disconnect Modal', () => {
  it('renders connected Google Calendar account and opens confirmation popup when clicking Desconectar Conta', () => {
    const onDisconnect = vi.fn();

    render(
      <ToastProvider>
        <IntegrationsTab
          formId={1}
          webhookUrl=""
          setWebhookUrl={vi.fn()}
          saving={false}
          testingWebhook={false}
          googleCalConnected={true}
          googleCalEmail="aryarajunity@gmail.com"
          onSaveWebhook={vi.fn()}
          onTestWebhook={vi.fn()}
          onConnectGoogleCalendar={vi.fn()}
          onDisconnectGoogleCalendar={onDisconnect}
        />
      </ToastProvider>
    );

    // Verifica que a conta conectada é exibida
    expect(screen.getByTestId('google-connected-email')).toHaveTextContent('aryarajunity@gmail.com');

    // Modal inicialmente fechado
    expect(screen.queryByTestId('confirm-disconnect-google-modal')).toBeNull();

    // Clica no botão Desconectar Conta
    const disconnectBtn = screen.getByTestId('disconnect-google-cal-btn');
    fireEvent.click(disconnectBtn);

    // Modal de confirmação é aberto no centro da tela
    expect(screen.getByTestId('confirm-disconnect-google-modal')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-disconnect-title')).toHaveTextContent('Desconectar Google Agenda');
    expect(screen.getByTestId('confirm-disconnect-message')).toHaveTextContent('aryarajunity@gmail.com');

    // Ao clicar no backdrop overlay, NÃO deve fechar (regra obrigatória de UX)
    const overlay = screen.getByTestId('confirm-disconnect-google-modal-overlay');
    fireEvent.click(overlay);
    expect(screen.getByTestId('confirm-disconnect-google-modal')).toBeInTheDocument();

    // Clica em Cancelar: fecha o modal e NÃO chama a função de desconexão
    const cancelBtn = screen.getByTestId('cancel-disconnect-google-btn');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('confirm-disconnect-google-modal')).toBeNull();
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('calls onDisconnectGoogleCalendar when confirming disconnect in the modal', () => {
    const onDisconnect = vi.fn();

    render(
      <ToastProvider>
        <IntegrationsTab
          formId={1}
          webhookUrl=""
          setWebhookUrl={vi.fn()}
          saving={false}
          testingWebhook={false}
          googleCalConnected={true}
          googleCalEmail="aryarajunity@gmail.com"
          onSaveWebhook={vi.fn()}
          onTestWebhook={vi.fn()}
          onConnectGoogleCalendar={vi.fn()}
          onDisconnectGoogleCalendar={onDisconnect}
        />
      </ToastProvider>
    );

    // Abre o modal
    fireEvent.click(screen.getByTestId('disconnect-google-cal-btn'));
    expect(screen.getByTestId('confirm-disconnect-google-modal')).toBeInTheDocument();

    // Confirma a desconexão
    const confirmBtn = screen.getByTestId('confirm-disconnect-google-btn');
    fireEvent.click(confirmBtn);

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('confirm-disconnect-google-modal')).toBeNull();
  });
});
