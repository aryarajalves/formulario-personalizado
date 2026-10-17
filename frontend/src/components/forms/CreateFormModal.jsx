import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import './CreateFormModal.css';

export default function CreateFormModal({ isOpen, onClose, onCreateSuccess }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Por favor, informe o título do seu formulário.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onCreateSuccess(cleanTitle);
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao criar o formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-form-modal-overlay" data-testid="create-form-modal-overlay">
      <div className="create-form-modal-card" data-testid="create-form-modal-card">
        {/* Botão de Fechar no Canto Superior Direito com Atalho ESC */}
        <button
          type="button"
          className="create-form-close-btn"
          onClick={onClose}
          disabled={loading}
          title="Fechar (Esc)"
          data-testid="create-form-close-btn"
        >
          <X size={18} />
          <span className="esc-badge">ESC</span>
        </button>

        <form onSubmit={handleSubmit} className="create-form-content">
          <h2 className="create-form-title">Qual é o título do seu formulário?</h2>

          <div className="create-form-input-wrapper">
            <input
              type="text"
              className="create-form-input"
              placeholder="Ex: Pesquisa de Satisfação do Cliente"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              disabled={loading}
              data-testid="create-form-title-input"
            />
          </div>

          {error && <p className="create-form-error-msg">{error}</p>}

          <div className="create-form-actions">
            <button
              type="submit"
              className="create-form-submit-btn"
              disabled={loading || !title.trim()}
              data-testid="create-form-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="spinner-icon" size={18} />
                  <span>Criando formulário...</span>
                </>
              ) : (
                'Criar formulário'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
