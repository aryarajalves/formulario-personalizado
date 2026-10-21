import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDeleteBookingModal from './ConfirmDeleteBookingModal';

describe('ConfirmDeleteBookingModal Component', () => {
  const mockBooking = {
    response_id: 10,
    contact_name: 'Lead Teste Modal',
    contact_email: 'lead@teste.com',
    contact_phone: '+55 85 99999-0000',
    formatted_datetime: '25/10/26 15:00'
  };

  it('renders modal with lead details and handles confirm and cancel', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDeleteBookingModal
        isOpen={true}
        booking={mockBooking}
        loading={false}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(screen.getByTestId('delete-booking-modal')).toBeInTheDocument();
    expect(screen.getByText('Excluir Agendamento?')).toBeInTheDocument();
    expect(screen.getByText('Lead Teste Modal')).toBeInTheDocument();
    expect(screen.getByText('lead@teste.com')).toBeInTheDocument();
    expect(screen.getByText('+55 85 99999-0000')).toBeInTheDocument();
    expect(screen.getByText('25/10/26 15:00')).toBeInTheDocument();

    // Testa botão de Cancelar
    fireEvent.click(screen.getByTestId('cancel-delete-booking-btn'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Testa botão de Confirmar Exclusão
    fireEvent.click(screen.getByTestId('confirm-delete-booking-btn'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDeleteBookingModal
        isOpen={false}
        booking={mockBooking}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
