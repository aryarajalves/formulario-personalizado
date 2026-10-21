import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InteractiveBookingCalendar from './InteractiveBookingCalendar';

describe('InteractiveBookingCalendar Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders month navigation and available time slots from backend API', async () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const testDateKey = `${y}-${m}-20`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          slot_duration: 60,
          working_days: [1, 2, 3, 4, 5]
        },
        slots_by_date: {
          [testDateKey]: [
            {
              time: '09:00',
              end_time: '10:00',
              start_iso: `${testDateKey}T09:00:00-03:00`,
              end_iso: `${testDateKey}T10:00:00-03:00`
            },
            {
              time: '14:00',
              end_time: '15:00',
              start_iso: `${testDateKey}T14:00:00-03:00`,
              end_iso: `${testDateKey}T15:00:00-03:00`
            }
          ]
        }
      })
    });

    const onChange = vi.fn();

    render(
      <InteractiveBookingCalendar
        formSlug="slug-teste"
        value=""
        onChange={onChange}
      />
    );

    // Deve exibir o container principal do calendário
    expect(screen.getByTestId('interactive-booking-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-month-year')).toBeInTheDocument();

    // Espera os slots carregarem
    await waitFor(() => {
      expect(screen.getByTestId('slot-time-btn-09-00')).toBeInTheDocument();
      expect(screen.getByTestId('slot-time-btn-14-00')).toBeInTheDocument();
    });

    // Clica no slot das 14:00
    fireEvent.click(screen.getByTestId('slot-time-btn-14-00'));

    expect(onChange).toHaveBeenCalledWith(`${testDateKey}T14:00:00-03:00`);

    // Deve exibir o resumo da seleção e o botão de confirmação
    expect(screen.getByTestId('selected-slot-summary')).toHaveTextContent('14:00');
    expect(screen.getByTestId('booking-confirm-slot-btn')).toBeInTheDocument();
  });

  it('renders confirmation button only after selecting slot, does not auto-advance, and triggers onConfirm on click', async () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const testDateKey = `${y}-${m}-20`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: { slot_duration: 60 },
        slots_by_date: {
          [testDateKey]: [
            {
              time: '10:00',
              end_time: '11:00',
              start_iso: `${testDateKey}T10:00:00-03:00`,
              end_iso: `${testDateKey}T11:00:00-03:00`
            }
          ]
        }
      })
    });

    const onConfirm = vi.fn();
    const onChange = vi.fn();

    render(
      <InteractiveBookingCalendar
        formSlug="slug-teste"
        value=""
        onChange={onChange}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('slot-time-btn-10-00')).toBeInTheDocument();
    });

    // Antes de clicar no horário, o botão de confirmação NÃO deve estar visível
    expect(screen.queryByTestId('booking-confirm-slot-btn')).toBeNull();

    // Clica no horário 10:00
    fireEvent.click(screen.getByTestId('slot-time-btn-10-00'));

    // Botão de confirmação agora aparece
    const confirmBtn = screen.getByTestId('booking-confirm-slot-btn');
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toHaveTextContent('Confirmar Agendamento');

    // onConfirm NÃO deve ter sido chamado automaticamente
    expect(onConfirm).not.toHaveBeenCalled();

    // Clica no botão de confirmação explicitamente
    fireEvent.click(confirmBtn);

    // Agora sim onConfirm deve ter sido chamado com a data/hora selecionada
    expect(onConfirm).toHaveBeenCalledWith(`${testDateKey}T10:00:00-03:00`);
  });

  it('allows navigating to next month', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        slots_by_date: {}
      })
    });

    render(
      <InteractiveBookingCalendar
        formSlug="slug-teste"
        value=""
        onChange={vi.fn()}
      />
    );

    const initialMonthTitle = screen.getByTestId('calendar-month-year').textContent;
    const nextBtn = screen.getByTestId('calendar-next-month-btn');

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-month-year').textContent).not.toBe(initialMonthTitle);
    });
  });

  it('generates real-time live preview slots with custom time ranges and lunch breaks when previewSettings is provided', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 8, 0, 0)); // 08:00 da manhã (antes das 09:00)

    render(
      <InteractiveBookingCalendar
        formSlug="slug-preview"
        previewSettings={{
          workingDays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges: [
            { start_time: '09:00', end_time: '12:00' },
            { start_time: '15:00', end_time: '19:00' }
          ],
          slotDuration: 60,
          bufferMinutes: 0
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    // Deve gerar os slots do turno 1 (09:00, 10:00, 11:00)
    expect(screen.getByTestId('slot-time-btn-09-00')).toBeInTheDocument();
    expect(screen.getByTestId('slot-time-btn-10-00')).toBeInTheDocument();
    expect(screen.getByTestId('slot-time-btn-11-00')).toBeInTheDocument();

    // Deve gerar os slots do turno 2 (15:00, 16:00, 17:00, 18:00)
    expect(screen.getByTestId('slot-time-btn-15-00')).toBeInTheDocument();
    expect(screen.getByTestId('slot-time-btn-16-00')).toBeInTheDocument();
    expect(screen.getByTestId('slot-time-btn-17-00')).toBeInTheDocument();
    expect(screen.getByTestId('slot-time-btn-18-00')).toBeInTheDocument();

    // Período de almoço/pausa (12:00 às 15:00) NÃO deve ter slots
    expect(screen.queryByTestId('slot-time-btn-12-00')).toBeNull();
    expect(screen.queryByTestId('slot-time-btn-13-00')).toBeNull();
    expect(screen.queryByTestId('slot-time-btn-14-00')).toBeNull();

    vi.useRealTimers();
  });

  it('filters out past hours for today when current time has already passed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 9, 10, 0)); // 21 de outubro de 2026, 09:10

    render(
      <InteractiveBookingCalendar
        formSlug="slug-preview"
        previewSettings={{
          workingDays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges: [
            { start_time: '09:00', end_time: '12:00' },
            { start_time: '15:00', end_time: '19:00' }
          ],
          slotDuration: 60,
          bufferMinutes: 0
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    // Às 09:10, o horário das 09:00 já passou e NÃO deve aparecer para hoje
    expect(screen.queryByTestId('slot-time-btn-09-00')).toBeNull();
    // Horários futuros de hoje (10:00, 11:00, 15:00) devem aparecer normalmente
    expect(screen.getByTestId('slot-time-btn-10-00')).toBeInTheDocument();
    expect(screen.getByTestId('slot-time-btn-15-00')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('filters out slots that overlap with busy_intervals from Google Calendar and booked responses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 8, 0, 0));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: { slot_duration: 60 },
        slots_by_date: {},
        busy_intervals: [
          // Evento ocupado no Google Calendar às 20:00
          {
            start: '2026-10-21T20:00:00-03:00',
            end: '2026-10-21T23:59:59-03:00'
          }
        ]
      })
    });

    render(
      <InteractiveBookingCalendar
        formSlug="slug-com-evento"
        previewSettings={{
          workingDays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges: [
            { start_time: '15:00', end_time: '21:00' }
          ],
          slotDuration: 60,
          bufferMinutes: 0
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    // Aguarda o cruzamento com busy_intervals
    await vi.runAllTimersAsync();

    // 15:00, 16:00, 17:00, 18:00, 19:00 devem aparecer
    expect(screen.getByTestId('slot-time-btn-15-00')).toBeInTheDocument();
    expect(screen.getByTestId('slot-time-btn-19-00')).toBeInTheDocument();

    // 20:00 está ocupado na Google Agenda e NÃO PODE APARECER
    expect(screen.queryByTestId('slot-time-btn-20-00')).toBeNull();

    vi.useRealTimers();
  });

  it('separates slots with intervals into distinct groups with an interval divider', async () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const testDateKey = `${y}-${m}-25`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          slot_duration: 60,
          working_days: [1, 2, 3, 4, 5, 6, 7]
        },
        slots_by_date: {
          [testDateKey]: [
            { time: '09:00', start_iso: `${testDateKey}T09:00:00-03:00` },
            { time: '10:00', start_iso: `${testDateKey}T10:00:00-03:00` },
            { time: '11:00', start_iso: `${testDateKey}T11:00:00-03:00` },
            { time: '14:00', start_iso: `${testDateKey}T14:00:00-03:00` },
            { time: '15:00', start_iso: `${testDateKey}T15:00:00-03:00` }
          ]
        }
      })
    });

    render(
      <InteractiveBookingCalendar
        formSlug="slug-com-intervalo"
        value=""
        onChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('slots-interval-group-0')).toBeInTheDocument();
      expect(screen.getByTestId('slots-interval-group-1')).toBeInTheDocument();
      expect(screen.getByTestId('slots-interval-divider-1')).toBeInTheDocument();
      expect(screen.getByText('Intervalo')).toBeInTheDocument();
    });
  });
});
