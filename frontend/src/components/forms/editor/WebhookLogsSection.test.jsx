import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WebhookLogsSection from './WebhookLogsSection';

describe('WebhookLogsSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading and then displays list of delivery logs with status and duration', async () => {
    const mockLogs = [
      {
        id: 101,
        webhook_url: 'https://webhook.site/abc',
        status_code: 200,
        success: true,
        duration_ms: 142,
        created_at: '17/10/2026 15:30:00'
      },
      {
        id: 102,
        webhook_url: 'https://crm.exemplo.com/hook',
        status_code: 500,
        success: false,
        error_message: 'HTTP 500: Internal Server Error',
        duration_ms: 320,
        created_at: '17/10/2026 15:35:12'
      }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logs: mockLogs, total: 2 })
    });

    render(<WebhookLogsSection formId={1} webhookUrl="https://webhook.site/abc" />);

    expect(screen.getByText('Histórico de Disparos de Webhook')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId('webhook-log-item-101')).toBeDefined();
      expect(screen.getByTestId('webhook-log-item-102')).toBeDefined();
    });

    // Log 101: 200 sucesso
    expect(screen.getByText('142ms')).toBeDefined();
    expect(screen.getByText('17/10/2026 15:30:00')).toBeDefined();

    // Log 102: 500 falha com mensagem de erro
    expect(screen.getByText('320ms')).toBeDefined();
    expect(screen.getByText(/Internal Server Error/i)).toBeDefined();
  });

  it('displays empty state when there are no logs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logs: [], total: 0 })
    });

    render(<WebhookLogsSection formId={1} webhookUrl="" />);

    await waitFor(() => {
      expect(screen.getByTestId('webhook-logs-empty')).toBeDefined();
    });

    expect(screen.getByText(/Nenhum disparo registrado ainda/i)).toBeDefined();
  });

  it('allows clicking the refresh button to reload logs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logs: [], total: 0 })
    });

    render(<WebhookLogsSection formId={1} webhookUrl="" />);

    await waitFor(() => {
      expect(screen.getByTestId('webhook-logs-empty')).toBeDefined();
    });

    const refreshBtn = screen.getByTestId('refresh-webhook-logs-btn');
    fireEvent.click(refreshBtn);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('initially displays only first 2 logs when total > 2 and toggles show more / show less', async () => {
    const mockFourLogs = [
      { id: 1, webhook_url: 'https://exemplo.com/1', status_code: 200, success: true, created_at: '20/10 10:00' },
      { id: 2, webhook_url: 'https://exemplo.com/2', status_code: 200, success: true, created_at: '20/10 10:01' },
      { id: 3, webhook_url: 'https://exemplo.com/3', status_code: 500, success: false, created_at: '20/10 10:02' },
      { id: 4, webhook_url: 'https://exemplo.com/4', status_code: 200, success: true, created_at: '20/10 10:03' }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logs: mockFourLogs, total: 4 })
    });

    render(<WebhookLogsSection formId={1} webhookUrl="https://exemplo.com" />);

    await waitFor(() => {
      expect(screen.getByTestId('webhook-log-item-1')).toBeDefined();
      expect(screen.getByTestId('webhook-log-item-2')).toBeDefined();
    });

    // Logs 3 e 4 não devem estar visíveis inicialmente
    expect(screen.queryByTestId('webhook-log-item-3')).toBeNull();
    expect(screen.queryByTestId('webhook-log-item-4')).toBeNull();

    // Botão de expandir lista
    const expandListBtn = screen.getByTestId('toggle-webhook-logs-expand-btn');
    expect(expandListBtn.textContent).toContain('Mostrar mais (2 disparos restantes)');

    // Clica para expandir
    fireEvent.click(expandListBtn);

    // Agora todos os 4 logs estão no DOM
    expect(screen.getByTestId('webhook-log-item-3')).toBeDefined();
    expect(screen.getByTestId('webhook-log-item-4')).toBeDefined();
    expect(expandListBtn.textContent).toContain('Recolher para os 2 primeiros disparos');

    // Clica para recolher novamente
    fireEvent.click(expandListBtn);
    expect(screen.queryByTestId('webhook-log-item-3')).toBeNull();
    expect(screen.queryByTestId('webhook-log-item-4')).toBeNull();
  });

  it('collapses and expands entire webhook logs section from header button', async () => {
    const mockLogs = [
      { id: 1, webhook_url: 'https://exemplo.com/1', status_code: 200, success: true, created_at: '20/10 10:00' }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logs: mockLogs, total: 1 })
    });

    render(<WebhookLogsSection formId={1} webhookUrl="https://exemplo.com" />);

    await waitFor(() => {
      expect(screen.getByTestId('webhook-log-item-1')).toBeDefined();
    });

    // Clica para recolher toda a seção
    const toggleSectionBtn = screen.getByTestId('toggle-section-collapse-btn');
    fireEvent.click(toggleSectionBtn);

    // Lista não deve mais estar visível
    expect(screen.queryByTestId('webhook-logs-list')).toBeNull();

    // Clica novamente para expandir
    fireEvent.click(toggleSectionBtn);
    expect(screen.getByTestId('webhook-log-item-1')).toBeDefined();
  });
});
