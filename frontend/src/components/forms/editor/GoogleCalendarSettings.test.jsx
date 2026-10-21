import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleCalendarSettings from './GoogleCalendarSettings';
import { ToastProvider } from '../../../context/ToastContext';

describe('GoogleCalendarSettings Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('auth_token', 'fake-jwt-token');
  });

  it('renders days of week, time ranges and allows toggling working days', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          working_days: [1, 2, 3, 4, 5],
          time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
          slot_duration: 60,
          buffer_minutes: 0
        }
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="meu-slug" />
      </ToastProvider>
    );

    // Espera carregar
    await waitFor(() => {
      expect(screen.getByTestId('expert-schedule-config')).toBeInTheDocument();
    });

    expect(screen.getByText('Horários de Atendimento (Turnos e Intervalos)')).toBeInTheDocument();

    // Valida dia de atendimento (Segunda-feira)
    const segChip = screen.getByTestId('day-chip-1');
    expect(segChip).toHaveClass('active');

    // Desativa Segunda
    fireEvent.click(segChip);
    expect(segChip).not.toHaveClass('active');

    // Altera horário de início pelo dropdown
    const startInput = screen.getByTestId('range-start-0');
    expect(startInput.tagName).toBe('SELECT');
    expect(startInput.querySelectorAll('option').length).toBe(48);
    fireEvent.change(startInput, { target: { value: '10:00' } });
    expect(startInput.value).toBe('10:00');

    // Altera duração para 30 min
    const durationSelect = screen.getByTestId('expert-duration-select');
    fireEvent.change(durationSelect, { target: { value: '30' } });
    expect(durationSelect.value).toBe('30');
  });

  it('allows adding and removing multiple time ranges (turnos/pausas)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          working_days: [1, 2, 3, 4, 5],
          time_ranges: [{ start_time: '09:00', end_time: '12:00' }],
          slot_duration: 60,
          buffer_minutes: 0
        }
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="meu-slug" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('time-range-row-0')).toBeInTheDocument();
    });

    // Inicialmente apenas 1 turno
    expect(screen.queryByTestId('time-range-row-1')).toBeNull();

    // Clica em adicionar turno
    const addBtn = screen.getByTestId('add-timerange-btn');
    fireEvent.click(addBtn);

    // Agora há 2 turnos
    expect(screen.getByTestId('time-range-row-1')).toBeInTheDocument();

    // Altera o segundo turno para 15:00 às 20:00
    fireEvent.change(screen.getByTestId('range-start-1'), { target: { value: '15:00' } });
    fireEvent.change(screen.getByTestId('range-end-1'), { target: { value: '20:00' } });

    expect(screen.getByTestId('range-start-1').value).toBe('15:00');
    expect(screen.getByTestId('range-end-1').value).toBe('20:00');

    // Remove o segundo turno
    const removeBtn = screen.getByTestId('remove-range-1');
    fireEvent.click(removeBtn);

    expect(screen.queryByTestId('time-range-row-1')).toBeNull();
  });

  it('shows error and disables save when end time is before start time in a range', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          working_days: [1],
          time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
          slot_duration: 60,
          buffer_minutes: 0
        }
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="meu-slug" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('range-end-0')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('range-error-0')).toBeNull();
    fireEvent.change(screen.getByTestId('range-end-0'), { target: { value: '08:00' } });

    expect(screen.getByTestId('range-error-0')).toBeInTheDocument();
    expect(screen.getByTestId('save-schedule-settings-btn')).toBeDisabled();
  });

  it('submits updated settings with time_ranges to backend when clicking save button', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            working_days: [1, 2, 3, 4, 5],
            time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
            slot_duration: 60,
            buffer_minutes: 0
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            working_days: [1, 2, 3, 4, 5],
            time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
            slot_duration: 60,
            buffer_minutes: 0
          }
        })
      });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="meu-slug" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('save-schedule-settings-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('save-schedule-settings-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/forms/123/integrations/google-calendar/settings',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  it('allows navigating between subtabs: Horários, Evento, Prévia and Agendamentos', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          working_days: [1, 2, 3],
          time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
          slot_duration: 60,
          buffer_minutes: 0,
          event_title: 'Reunião Padrão'
        },
        bookings: []
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="meu-slug" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-pane-horarios')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('tab-pane-evento')).toBeNull();
    expect(screen.queryByTestId('tab-pane-previa')).toBeNull();
    expect(screen.queryByTestId('tab-pane-agendamentos')).toBeNull();

    // Navega para Evento
    fireEvent.click(screen.getByTestId('subtab-evento-btn'));
    expect(screen.getByTestId('tab-pane-evento')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-pane-horarios')).toBeNull();

    // Navega para Prévia
    fireEvent.click(screen.getByTestId('subtab-previa-btn'));
    expect(screen.getByTestId('tab-pane-previa')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-pane-evento')).toBeNull();

    // Navega para Agendamentos
    fireEvent.click(screen.getByTestId('subtab-agendamentos-btn'));
    expect(screen.getByTestId('tab-pane-agendamentos')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-pane-previa')).toBeNull();

    // Volta para Horários
    fireEvent.click(screen.getByTestId('subtab-horarios-btn'));
    expect(screen.getByTestId('tab-pane-horarios')).toBeInTheDocument();
  });

  it('renders live calendar preview when formSlug is provided and switching to previa tab', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          working_days: [1, 2, 3, 4, 5],
          time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
          slot_duration: 60,
          buffer_minutes: 0
        },
        slots_by_date: {}
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="slug-preview" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subtab-previa-btn')).toBeInTheDocument();
    });

    // Clica na sub-aba de Prévia do Calendário
    fireEvent.click(screen.getByTestId('subtab-previa-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-live-preview')).toBeInTheDocument();
      expect(screen.getByTestId('preview-calendar-wrapper')).toBeInTheDocument();
    });
  });

  it('allows customizing event title, description, and selecting calendar color and saving to backend', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: {
            working_days: [1, 2, 3, 4, 5],
            time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
            slot_duration: 60,
            buffer_minutes: 0,
            event_title: 'Reunião Inicial',
            event_description: 'Descrição padrão',
            event_color_id: '9'
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {}
        })
      });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="meu-slug" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subtab-evento-btn')).toBeInTheDocument();
    });

    // Navega para a aba de personalização do evento
    fireEvent.click(screen.getByTestId('subtab-evento-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('google-calendar-event-config')).toBeInTheDocument();
    });

    // Valida título inicial
    const titleInput = screen.getByTestId('calendar-event-title-input');
    expect(titleInput.value).toBe('Reunião Inicial');

    // Insere tag no título
    fireEvent.click(screen.getByTestId('tag-nome-title'));
    expect(titleInput.value).toBe('Reunião Inicial {nome}');

    // Altera descrição
    const descInput = screen.getByTestId('calendar-event-description-input');
    fireEvent.change(descInput, { target: { value: 'Nova descrição customizada' } });

    // Seleciona cor 11 (Tomate)
    const color11 = screen.getByTestId('color-swatch-11');
    fireEvent.click(color11);
    expect(color11).toHaveClass('active');

    // Salva configurações na aba de evento
    fireEvent.click(screen.getByTestId('save-event-settings-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/forms/123/integrations/google-calendar/settings',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"event_color_id":"11"')
        })
      );
    });
  });

  it('allows switching to sub-tab Lembretes, toggling reminder options and saving', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          settings: {
            working_days: [1, 2, 3, 4, 5],
            time_ranges: [{ start_time: '09:00', end_time: '18:00' }],
            slot_duration: 60,
            reminder_morning_enabled: true,
            reminder_morning_time: '09:00',
            reminder_before_enabled: true,
            reminder_before_minutes: 30,
            reminder_webhook_url: 'https://webhook.site/custom-reminders'
          },
          reminders: []
        })
      });
    });

    render(
      <ToastProvider>
        <GoogleCalendarSettings formId={123} formSlug="meu-slug" formWebhookUrl="https://webhook.site/default" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subtab-lembretes-btn')).toBeInTheDocument();
    });

    // Clica na sub-aba Lembretes
    fireEvent.click(screen.getByTestId('subtab-lembretes-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('google-calendar-reminders-config')).toBeInTheDocument();
    });

    // Altera tempo de antecedência
    const beforeSelect = screen.getByTestId('select-reminder-before-minutes');
    fireEvent.change(beforeSelect, { target: { value: '45' } });

    // Salva configurações na aba de lembretes
    fireEvent.click(screen.getByTestId('save-reminders-settings-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/forms/123/integrations/google-calendar/settings',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"reminder_before_minutes":45')
        })
      );
    });
  });
});
