import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkDeleteModal from './BulkDeleteModal';

describe('BulkDeleteModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BulkDeleteModal
        isOpen={false}
        count={2}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders single deletion title and description when count is 1', () => {
    render(
      <BulkDeleteModal
        isOpen={true}
        count={1}
        singleFormTitle="Pesquisa de Leads"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId('bulk-delete-title').textContent).toContain('Excluir "Pesquisa de Leads"?');
    expect(screen.getByTestId('bulk-delete-message').textContent).toContain('"Pesquisa de Leads"');
    expect(screen.getByTestId('confirm-bulk-delete-btn').textContent).toContain('Sim, excluir');
  });

  it('renders bulk deletion title and count when count > 1', () => {
    render(
      <BulkDeleteModal
        isOpen={true}
        count={3}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId('bulk-delete-title').textContent).toContain('Excluir 3 formulários?');
    expect(screen.getByTestId('bulk-delete-message').textContent).toContain('3 formulários selecionados');
    expect(screen.getByTestId('confirm-bulk-delete-btn').textContent).toContain('Sim, excluir (3)');
  });

  it('calls onClose when clicking Cancelar', () => {
    const handleClose = vi.fn();
    render(
      <BulkDeleteModal
        isOpen={true}
        count={2}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('cancel-bulk-delete-btn'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when clicking confirm button', () => {
    const handleConfirm = vi.fn();
    render(
      <BulkDeleteModal
        isOpen={true}
        count={2}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('confirm-bulk-delete-btn'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables buttons when loading is true', () => {
    render(
      <BulkDeleteModal
        isOpen={true}
        count={2}
        loading={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Excluindo...')).toBeDefined();
    expect(screen.getByTestId('cancel-bulk-delete-btn')).toBeDisabled();
    expect(screen.getByTestId('confirm-bulk-delete-btn')).toBeDisabled();
  });
});
