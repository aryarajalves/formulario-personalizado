import React from 'react';
import { Trash2 } from 'lucide-react';

export default function DeleteConfirmModal({
  deleteConfirm,
  setDeleteConfirm,
  onConfirm
}) {
  if (!deleteConfirm?.isOpen) return null;

  return (
    <div
      className="modal-overlay"
      data-testid="confirm-delete-modal-overlay"
      onClick={(e) => {
        // Regra obrigatória: NÃO fecha ao clicar no backdrop/fora do painel
        e.stopPropagation();
      }}
    >
      <div
        className="modal-content confirm-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-modal-title"
        data-testid="confirm-delete-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="confirm-delete-icon-wrapper"
          style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#ef4444' }}
        >
          <Trash2 size={28} />
        </div>

        <h3 id="confirm-delete-modal-title" className="confirm-delete-title" data-testid="confirm-delete-title">
          {deleteConfirm.type === 'question' ? 'Excluir Questão' : 'Excluir Tela Final'}
        </h3>

        <p className="confirm-delete-message" data-testid="confirm-delete-message">
          Tem certeza que deseja excluir permanentemente {deleteConfirm.title}? Esta ação não poderá ser desfeita.
        </p>

        <div className="confirm-delete-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setDeleteConfirm({ isOpen: false, type: null, index: null, title: '' })}
            data-testid="cancel-delete-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="confirm-danger-btn"
            onClick={onConfirm}
            data-testid="confirm-delete-btn"
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
