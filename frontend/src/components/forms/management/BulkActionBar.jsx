import React from 'react';
import { Trash2, X, CheckSquare } from 'lucide-react';
import './BulkActionBar.css';

export default function BulkActionBar({
  selectedCount,
  onClearSelection,
  onOpenDeleteModal
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-action-bar-container" data-testid="bulk-action-bar">
      <div className="bulk-action-bar-info">
        <CheckSquare size={16} className="bulk-check-icon" />
        <span className="bulk-count-text" data-testid="bulk-selected-count">
          <strong>{selectedCount}</strong> {selectedCount === 1 ? 'formulário selecionado' : 'formulários selecionados'}
        </span>
      </div>

      <div className="bulk-action-bar-buttons">
        <button
          type="button"
          className="bulk-clear-btn"
          onClick={onClearSelection}
          data-testid="bulk-clear-selection-btn"
          title="Desmarcar todos"
        >
          <X size={14} />
          <span>Desmarcar</span>
        </button>

        <button
          type="button"
          className="bulk-delete-trigger-btn"
          onClick={onOpenDeleteModal}
          data-testid="bulk-delete-trigger-btn"
        >
          <Trash2 size={15} />
          <span>Excluir selecionados</span>
        </button>
      </div>
    </div>
  );
}
