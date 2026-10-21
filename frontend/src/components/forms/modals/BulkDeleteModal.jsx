import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import './BulkDeleteModal.css';

export default function BulkDeleteModal({
  isOpen,
  count,
  singleFormTitle,
  loading,
  onClose,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div
      className="bulk-delete-modal-overlay delete-confirm-overlay"
      data-testid="bulk-delete-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bulk-delete-modal-card delete-confirm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
        data-testid="bulk-delete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bulk-delete-icon-wrapper">
          <Trash2 size={24} />
        </div>

        <h3 id="bulk-delete-title" className="bulk-delete-title" data-testid="bulk-delete-title">
          {count === 1
            ? (singleFormTitle ? `Excluir "${singleFormTitle}"?` : 'Excluir formulário?')
            : `Excluir ${count} formulários?`}
        </h3>

        <p className="bulk-delete-message" data-testid="bulk-delete-message">
          {count === 1
            ? `Tem certeza que deseja excluir ${singleFormTitle ? `"${singleFormTitle}"` : 'este formulário'}? Todas as respostas e dados associados serão removidos permanentemente.`
            : `Tem certeza que deseja excluir os ${count} formulários selecionados? Todas as respostas e dados associados serão removidos permanentemente.`}
        </p>

        <div className="bulk-delete-actions">
          <button
            type="button"
            className="bulk-delete-cancel-btn cancel-delete-btn"
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-bulk-delete-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="bulk-delete-confirm-btn confirm-delete-btn"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-bulk-delete-btn"
          >
            {loading ? (
              <>
                <Loader2 className="spinner-icon" size={15} />
                <span>Excluindo...</span>
              </>
            ) : (
              <span>Sim, excluir {count > 1 ? `(${count})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
