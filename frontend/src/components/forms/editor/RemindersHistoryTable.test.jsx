import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RemindersHistoryTable from './RemindersHistoryTable';

describe('RemindersHistoryTable Component', () => {
  const mockReminders = [
    {
      id: 101,
      contact_name: 'Ana Souza',
      contact_phone: '+55 85 98888-1234',
      reminder_label: 'Lembrete Matinal',
      reminder_type: 'morning',
      meeting_datetime: '25/10/26 10:00',
      scheduled_for_iso: '2026-10-25T09:00:00Z',
      status: 'PENDING'
    },
    {
      id: 102,
      contact_name: 'Bruno Lima',
      contact_phone: '+55 85 97777-5678',
      reminder_label: 'Lembrete Antecedência',
      reminder_type: 'before_meeting',
      meeting_datetime: '25/10/26 11:00',
      sent_at: '2026-10-25T10:30:00Z',
      status: 'SENT',
      status_code: 200
    }
  ];

  it('renders rows with proper badges and triggers action callbacks', () => {
    const handleEdit = vi.fn();
    const handleDispatch = vi.fn();
    const handleDelete = vi.fn();
    const handleRefresh = vi.fn();
    const handleChangeFilter = vi.fn();

    render(
      <RemindersHistoryTable
        remindersList={mockReminders}
        loadingReminders={false}
        filterMode="all"
        onChangeFilterMode={handleChangeFilter}
        onRefresh={handleRefresh}
        onEdit={handleEdit}
        onDispatch={handleDispatch}
        onDelete={handleDelete}
      />
    );

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('Aguardando Horário')).toBeInTheDocument();
    expect(screen.getByText('Sucesso (200 OK)')).toBeInTheDocument();

    // Trigger Edit
    fireEvent.click(screen.getByTestId('edit-reminder-btn-101'));
    expect(handleEdit).toHaveBeenCalledWith(mockReminders[0]);

    // Trigger Dispatch
    fireEvent.click(screen.getByTestId('dispatch-reminder-btn-101'));
    expect(handleDispatch).toHaveBeenCalledWith(mockReminders[0]);

    // Trigger Delete
    fireEvent.click(screen.getByTestId('delete-reminder-btn-101'));
    expect(handleDelete).toHaveBeenCalledWith(mockReminders[0]);

    // Trigger Refresh
    fireEvent.click(screen.getByTestId('refresh-reminders-btn'));
    expect(handleRefresh).toHaveBeenCalledTimes(1);

    // Switch Filter
    fireEvent.click(screen.getByTestId('filter-reminders-pending'));
    expect(handleChangeFilter).toHaveBeenCalledWith('pending');
  });

  it('renders empty message when no reminders match', () => {
    render(
      <RemindersHistoryTable
        remindersList={[]}
        loadingReminders={false}
        filterMode="dispatched"
        onChangeFilterMode={vi.fn()}
        onRefresh={vi.fn()}
        onEdit={vi.fn()}
        onDispatch={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('reminders-empty')).toHaveTextContent('Nenhum webhook foi disparado ainda');
  });

  it('renders pagination footer and triggers onPageChange when navigating pages', () => {
    const handlePageChange = vi.fn();

    render(
      <RemindersHistoryTable
        remindersList={mockReminders}
        loadingReminders={false}
        filterMode="all"
        page={2}
        totalPages={5}
        total={95}
        onPageChange={handlePageChange}
        onChangeFilterMode={vi.fn()}
        onRefresh={vi.fn()}
        onEdit={vi.fn()}
        onDispatch={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('reminders-pagination')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 2 de 95 lembretes (20 por página)');

    // Clica em Anterior
    const prevBtn = screen.getByTestId('pagination-prev-btn');
    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    // Clica em Próxima
    const nextBtn = screen.getByTestId('pagination-next-btn');
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });
});
