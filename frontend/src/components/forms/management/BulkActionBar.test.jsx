import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkActionBar from './BulkActionBar';

describe('BulkActionBar Component', () => {
  it('does not render when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionBar
        selectedCount={0}
        onClearSelection={vi.fn()}
        onOpenDeleteModal={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders correct text for 1 item and multiple items', () => {
    const { rerender } = render(
      <BulkActionBar
        selectedCount={1}
        onClearSelection={vi.fn()}
        onOpenDeleteModal={vi.fn()}
      />
    );

    expect(screen.getByTestId('bulk-selected-count').textContent).toContain('1 formulário selecionado');

    rerender(
      <BulkActionBar
        selectedCount={5}
        onClearSelection={vi.fn()}
        onOpenDeleteModal={vi.fn()}
      />
    );

    expect(screen.getByTestId('bulk-selected-count').textContent).toContain('5 formulários selecionados');
  });

  it('triggers onClearSelection when clicking Desmarcar', () => {
    const handleClear = vi.fn();
    render(
      <BulkActionBar
        selectedCount={3}
        onClearSelection={handleClear}
        onOpenDeleteModal={vi.fn()}
      />
    );

    const clearBtn = screen.getByTestId('bulk-clear-selection-btn');
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenDeleteModal when clicking Excluir selecionados', () => {
    const handleOpenDelete = vi.fn();
    render(
      <BulkActionBar
        selectedCount={2}
        onClearSelection={vi.fn()}
        onOpenDeleteModal={handleOpenDelete}
      />
    );

    const deleteBtn = screen.getByTestId('bulk-delete-trigger-btn');
    fireEvent.click(deleteBtn);
    expect(handleOpenDelete).toHaveBeenCalledTimes(1);
  });
});
