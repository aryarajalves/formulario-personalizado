import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleCalendarRemindersConfig from './GoogleCalendarRemindersConfig';
import { ToastProvider } from '../../../context/ToastContext';

describe('GoogleCalendarRemindersConfig Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('auth_token', 'test-jwt-token');
  });

  it('renders morning and before-meeting reminder settings correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        total: 0,
        reminders: []
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarRemindersConfig
          formId={123}
          formWebhookUrl="https://webhook.site/main"
          reminderMorningEnabled={true}
          onChangeReminderMorningEnabled={vi.fn()}
          reminderMorningTime="09:00"
          onChangeReminderMorningTime={vi.fn()}
          reminderBeforeEnabled={true}
          onChangeReminderBeforeEnabled={vi.fn()}
          reminderBeforeMinutes={30}
          onChangeReminderBeforeMinutes={vi.fn()}
          reminderWebhookUrl=""
          onChangeReminderWebhookUrl={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText('Lembretes e Disparos de Webhook')).toBeInTheDocument();
    expect(screen.getByText('Lembrete no Dia da Reunião')).toBeInTheDocument();
    expect(screen.getByText('Lembrete Pouco Antes da Reunião')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-reminder-morning')).toBeChecked();
    expect(screen.getByTestId('toggle-reminder-before')).toBeChecked();
    expect(screen.getByTestId('select-reminder-morning-time')).toHaveValue('09:00');
    expect(screen.getByTestId('select-reminder-before-minutes')).toHaveValue('30');
    expect(screen.getByTestId('reminders-empty')).toBeInTheDocument();
  });

  it('calls onChange callbacks when toggles and select options change', async () => {
    const onToggleMorning = vi.fn();
    const onToggleBefore = vi.fn();
    const onChangeMorningTime = vi.fn();
    const onChangeBeforeMinutes = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        total: 0,
        reminders: []
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarRemindersConfig
          formId={123}
          formWebhookUrl="https://webhook.site/main"
          reminderMorningEnabled={true}
          onChangeReminderMorningEnabled={onToggleMorning}
          reminderMorningTime="09:00"
          onChangeReminderMorningTime={onChangeMorningTime}
          reminderBeforeEnabled={true}
          onChangeReminderBeforeEnabled={onToggleBefore}
          reminderBeforeMinutes={30}
          onChangeReminderBeforeMinutes={onChangeBeforeMinutes}
          reminderWebhookUrl=""
          onChangeReminderWebhookUrl={vi.fn()}
        />
      </ToastProvider>
    );

    // Toggle morning
    fireEvent.click(screen.getByTestId('toggle-reminder-morning'));
    expect(onToggleMorning).toHaveBeenCalledWith(false);

    // Change morning time
    fireEvent.change(screen.getByTestId('select-reminder-morning-time'), { target: { value: '08:00' } });
    expect(onChangeMorningTime).toHaveBeenCalledWith('08:00');

    // Toggle before meeting
    fireEvent.click(screen.getByTestId('toggle-reminder-before'));
    expect(onToggleBefore).toHaveBeenCalledWith(false);

    // Change before minutes
    fireEvent.change(screen.getByTestId('select-reminder-before-minutes'), { target: { value: '60' } });
    expect(onChangeBeforeMinutes).toHaveBeenCalledWith(60);
  });

  it('renders list of scheduled reminders and triggers test webhook dispatch', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('/reminders/test')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            status_code: 200,
            message: 'Webhook de teste enviado!'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          total: 1,
          reminders: [
            {
              id: 1,
              contact_name: 'Lead Reunião',
              contact_phone: '+55 85 99999-9999',
              reminder_label: 'Lembrete do dia da reunião (09:00)',
              meeting_datetime: '23/10/26 14:00',
              scheduled_for_iso: '2026-10-23T12:00:00Z',
              status: 'PENDING'
            }
          ]
        })
      });
    });

    render(
      <ToastProvider>
        <GoogleCalendarRemindersConfig
          formId={123}
          formWebhookUrl="https://webhook.site/main"
          reminderMorningEnabled={true}
          onChangeReminderMorningEnabled={vi.fn()}
          reminderMorningTime="09:00"
          onChangeReminderMorningTime={vi.fn()}
          reminderBeforeEnabled={true}
          onChangeReminderBeforeEnabled={vi.fn()}
          reminderBeforeMinutes={30}
          onChangeReminderBeforeMinutes={vi.fn()}
          reminderWebhookUrl="https://webhook.site/custom-reminder"
          onChangeReminderWebhookUrl={vi.fn()}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('reminders-table-wrapper')).toBeInTheDocument();
    });

    expect(screen.getByText('Lead Reunião')).toBeInTheDocument();
    expect(screen.getByText(/Lembrete do dia da reunião/)).toBeInTheDocument();
    expect(screen.getByText(/23\/10\/26 14:00/)).toBeInTheDocument();
    expect(screen.getByText('Aguardando Horário')).toBeInTheDocument();

    // Clica em testar disparo
    const testBtn = screen.getByTestId('test-reminder-webhook-btn');
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reminders/test'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('renders dispatched reminder with success/failure status and filters list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        total: 2,
        reminders: [
          {
            id: 1,
            reminder_type: 'test',
            contact_name: 'Teste Manual',
            status: 'SENT',
            status_code: 200,
            sent_at: '2026-10-21T16:00:00Z',
            error_message: null
          },
          {
            id: 2,
            reminder_type: 'morning',
            contact_name: 'Lead Reunião',
            status: 'FAILED',
            status_code: 530,
            sent_at: '2026-10-21T16:05:00Z',
            error_message: 'HTTP 530: Servidor ou túnel Cloudflare offline (Error 1033).'
          }
        ]
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarRemindersConfig
          formId={123}
          formWebhookUrl="https://webhook.site/main"
          reminderMorningEnabled={true}
          onChangeReminderMorningEnabled={vi.fn()}
          reminderMorningTime="09:00"
          onChangeReminderMorningTime={vi.fn()}
          reminderBeforeEnabled={true}
          onChangeReminderBeforeEnabled={vi.fn()}
          reminderBeforeMinutes={30}
          onChangeReminderBeforeMinutes={vi.fn()}
          reminderWebhookUrl=""
          onChangeReminderWebhookUrl={vi.fn()}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Sucesso (200 OK)')).toBeInTheDocument();
    });

    expect(screen.getByText('Falha (HTTP 530)')).toBeInTheDocument();
    expect(screen.getByText(/Servidor ou túnel Cloudflare offline/)).toBeInTheDocument();

    // Filtra apenas agendados (deve exibir empty box pois os dois já foram disparados)
    fireEvent.click(screen.getByTestId('filter-reminders-pending'));
    expect(screen.getByTestId('reminders-empty')).toHaveTextContent('Nenhum lembrete na fila de agendamento');

    // Filtra disparados
    fireEvent.click(screen.getByTestId('filter-reminders-dispatched'));
    expect(screen.getByText('Sucesso (200 OK)')).toBeInTheDocument();
  });

  it('opens modals and performs edit, manual dispatch, and delete actions', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, message: 'Atualizado com sucesso' })
        });
      }
      if (opts?.method === 'POST' && url.includes('/dispatch')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, status_code: 200, message: 'Disparado com sucesso' })
        });
      }
      if (opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, message: 'Excluído com sucesso' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          total: 1,
          reminders: [
            {
              id: 99,
              contact_name: 'Lead Teste Modal',
              contact_phone: '+55 85 91111-2222',
              reminder_label: 'Lembrete Antecedência',
              meeting_datetime: '24/10/26 15:00',
              scheduled_for_iso: '2026-10-24T14:30:00Z',
              status: 'PENDING'
            }
          ]
        })
      });
    });

    render(
      <ToastProvider>
        <GoogleCalendarRemindersConfig
          formId={123}
          formWebhookUrl="https://webhook.site/main"
          reminderMorningEnabled={true}
          onChangeReminderMorningEnabled={vi.fn()}
          reminderMorningTime="09:00"
          onChangeReminderMorningTime={vi.fn()}
          reminderBeforeEnabled={true}
          onChangeReminderBeforeEnabled={vi.fn()}
          reminderBeforeMinutes={30}
          onChangeReminderBeforeMinutes={vi.fn()}
          reminderWebhookUrl=""
          onChangeReminderWebhookUrl={vi.fn()}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Teste Modal')).toBeInTheDocument();
    });

    // 1. Testa Editar
    fireEvent.click(screen.getByTestId('edit-reminder-btn-99'));
    expect(screen.getByTestId('edit-reminder-modal')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('input-edit-contact-name'), { target: { value: 'Lead Teste Editado' } });
    fireEvent.click(screen.getByTestId('save-edit-reminder-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reminders/99'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    // 2. Testa Disparar Manualmente
    fireEvent.click(screen.getByTestId('dispatch-reminder-btn-99'));
    expect(screen.getByTestId('dispatch-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dispatch-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reminders/99/dispatch'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    // 3. Testa Excluir
    fireEvent.click(screen.getByTestId('delete-reminder-btn-99'));
    expect(screen.getByTestId('delete-reminder-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-delete-reminder-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reminders/99'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
