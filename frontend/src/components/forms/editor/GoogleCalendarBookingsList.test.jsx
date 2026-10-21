import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleCalendarBookingsList from './GoogleCalendarBookingsList';
import { ToastProvider } from '../../../context/ToastContext';

describe('GoogleCalendarBookingsList Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('auth_token', 'test-jwt-token');
  });

  it('renders empty state when there are no scheduled bookings', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        total: 0,
        bookings: []
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarBookingsList formId={123} googleCalConnected={true} googleCalEmail="teste@gmail.com" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('bookings-empty')).toBeInTheDocument();
    });

    expect(screen.getByText('Nenhum agendamento realizado ainda')).toBeInTheDocument();
    expect(screen.getByTestId('bookings-count-badge')).toHaveTextContent('0 agendamentos');
  });

  it('renders table with scheduled bookings, lead info, and formatted date/time', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        total: 2,
        bookings: [
          {
            response_id: 1,
            contact_name: 'Aryaraj Alves Fernandes',
            contact_email: 'aryaraj@gmail.com',
            contact_phone: '+55 85988146141',
            question_title: 'Escolha seu horário',
            scheduled_iso: '2026-10-23T13:00:00-03:00',
            formatted_datetime: '23/10/26 13:00',
            google_calendar_connected: true
          },
          {
            response_id: 2,
            contact_name: 'Carlos Santos',
            contact_email: 'carlos@teste.com',
            contact_phone: '+55 11999998888',
            question_title: 'Escolha seu horário',
            scheduled_iso: '2026-10-24T15:30:00-03:00',
            formatted_datetime: '24/10/26 15:30',
            google_calendar_connected: true
          }
        ]
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarBookingsList formId={123} googleCalConnected={true} googleCalEmail="teste@gmail.com" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('bookings-table-wrapper')).toBeInTheDocument();
    });

    expect(screen.getByTestId('bookings-count-badge')).toHaveTextContent('2 agendamentos');

    // Primeiro agendamento
    expect(screen.getByText('Aryaraj Alves Fernandes')).toBeInTheDocument();
    expect(screen.getByText('23/10/26 13:00')).toBeInTheDocument();
    expect(screen.getByText('aryaraj@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('+55 85988146141')).toBeInTheDocument();

    // Segundo agendamento
    expect(screen.getByText('Carlos Santos')).toBeInTheDocument();
    expect(screen.getByText('24/10/26 15:30')).toBeInTheDocument();

    // Badges de sincronia
    const syncBadges = screen.getAllByText('Sincronizado na Agenda');
    expect(syncBadges.length).toBe(2);

    // Paginação
    expect(screen.getByTestId('bookings-pagination')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 2 de 2 agendamentos (20 por página)');
    expect(screen.getByTestId('pagination-prev-btn')).toBeDisabled();
    expect(screen.getByTestId('pagination-next-btn')).toBeDisabled();
  });

  it('handles multi-page pagination and navigation', async () => {
    // Página 1 mock
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('page=2')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            total: 25,
            page: 2,
            limit: 20,
            total_pages: 2,
            bookings: [
              {
                response_id: 21,
                contact_name: 'Lead Página 2',
                contact_email: 'lead21@teste.com',
                scheduled_iso: '2026-10-25T14:00:00-03:00',
                formatted_datetime: '25/10/26 14:00'
              }
            ]
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          total: 25,
          page: 1,
          limit: 20,
          total_pages: 2,
          bookings: [
            {
              response_id: 1,
              contact_name: 'Lead Página 1',
              contact_email: 'lead1@teste.com',
              scheduled_iso: '2026-10-23T13:00:00-03:00',
              formatted_datetime: '23/10/26 13:00'
            }
          ]
        })
      });
    });

    render(
      <ToastProvider>
        <GoogleCalendarBookingsList formId={123} googleCalConnected={true} googleCalEmail="teste@gmail.com" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Página 1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('bookings-count-badge')).toHaveTextContent('25 agendamentos');
    expect(screen.getByTestId('pagination-page-indicator')).toHaveTextContent('Página 1 de 2');
    expect(screen.getByTestId('pagination-prev-btn')).toBeDisabled();
    expect(screen.getByTestId('pagination-next-btn')).not.toBeDisabled();

    // Clica em Próxima
    fireEvent.click(screen.getByTestId('pagination-next-btn'));

    await waitFor(() => {
      expect(screen.getByText('Lead Página 2')).toBeInTheDocument();
    });

    expect(screen.getByTestId('pagination-page-indicator')).toHaveTextContent('Página 2 de 2');
    expect(screen.getByTestId('pagination-next-btn')).toBeDisabled();
    expect(screen.getByTestId('pagination-prev-btn')).not.toBeDisabled();

    // Clica em Anterior para voltar
    fireEvent.click(screen.getByTestId('pagination-prev-btn'));

    await waitFor(() => {
      expect(screen.getByText('Lead Página 1')).toBeInTheDocument();
    });
  });

  it('triggers refresh when clicking on Atualizar button', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        total: 0,
        bookings: []
      })
    });

    render(
      <ToastProvider>
        <GoogleCalendarBookingsList formId={123} googleCalConnected={true} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('refresh-bookings-btn')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('refresh-bookings-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('opens delete confirmation modal and calls delete endpoint when confirming', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, message: 'Agendamento excluído com sucesso.' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          total: 1,
          bookings: [
            {
              response_id: 88,
              contact_name: 'Lead Para Excluir',
              contact_email: 'excluir@teste.com',
              contact_phone: '+55 85 91111-2222',
              formatted_datetime: '23/10/26 14:00'
            }
          ]
        })
      });
    });

    render(
      <ToastProvider>
        <GoogleCalendarBookingsList formId={123} googleCalConnected={true} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Para Excluir')).toBeInTheDocument();
    });

    // Clica no botão Excluir
    const delBtn = screen.getByTestId('delete-booking-btn-0');
    fireEvent.click(delBtn);

    // Modal deve estar aberto
    expect(screen.getByTestId('delete-booking-modal')).toBeInTheDocument();
    expect(screen.getByText('Excluir Agendamento?')).toBeInTheDocument();

    // Confirma exclusão
    const confirmBtn = screen.getByTestId('confirm-delete-booking-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bookings/88'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
