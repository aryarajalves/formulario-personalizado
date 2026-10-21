import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditReminderModal from './EditReminderModal';
import ConfirmDispatchReminderModal from './ConfirmDispatchReminderModal';
import ConfirmDeleteReminderModal from './ConfirmDeleteReminderModal';

describe('Reminders Modals Unit Tests', () => {
  const mockReminder = {
    id: 42,
    contact_name: 'Carlos Silva',
    contact_phone: '+55 85 99999-1111',
    reminder_type: 'morning',
    reminder_label: 'Lembrete Matinal',
    meeting_datetime: '23/10/26 14:00',
    scheduled_for_iso: '2026-10-23T09:00:00Z',
    webhook_url: 'https://webhook.site/test-reminder'
  };

  describe('EditReminderModal', () => {
    it('renders initial form values and allows editing', () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <EditReminderModal
          isOpen={true}
          reminder={mockReminder}
          loading={false}
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('edit-reminder-modal')).toBeInTheDocument();
      const nameInput = screen.getByTestId('input-edit-contact-name');
      const phoneInput = screen.getByTestId('input-edit-contact-phone');

      expect(nameInput.value).toBe('Carlos Silva');
      expect(phoneInput.value).toBe('+55 85 99999-1111');

      fireEvent.change(nameInput, { target: { value: 'Carlos Atualizado' } });
      fireEvent.change(phoneInput, { target: { value: '+55 85 98888-2222' } });

      fireEvent.click(screen.getByTestId('save-edit-reminder-btn'));
      expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
        contact_name: 'Carlos Atualizado',
        contact_phone: '+55 85 98888-2222'
      }));
    });

    it('triggers onClose when clicking cancel button', () => {
      const handleClose = vi.fn();
      render(
        <EditReminderModal
          isOpen={true}
          reminder={mockReminder}
          loading={false}
          onClose={handleClose}
          onSave={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-edit-reminder-btn'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConfirmDispatchReminderModal', () => {
    it('renders details and calls onConfirm when clicking confirm', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmDispatchReminderModal
          isOpen={true}
          reminder={mockReminder}
          loading={false}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      );

      expect(screen.getByText('Disparar Webhook Manualmente?')).toBeInTheDocument();
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
      expect(screen.getByText('+55 85 99999-1111')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirm-dispatch-btn'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('cancel-dispatch-btn'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConfirmDeleteReminderModal', () => {
    it('renders details and calls onConfirm when clicking delete confirm', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmDeleteReminderModal
          isOpen={true}
          reminder={mockReminder}
          loading={false}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      );

      expect(screen.getByText('Excluir Lembrete Agendado?')).toBeInTheDocument();
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirm-delete-reminder-btn'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('cancel-delete-reminder-btn'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
