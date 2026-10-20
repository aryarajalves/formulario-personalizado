import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import './ImportFormModal.css';

export default function ImportFormModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setParsedData(null);
      setTitle('');
      setError('');
      setLoading(false);
      setIsDragging(false);
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

  const handleProcessFile = (selectedFile) => {
    if (!selectedFile) return;
    setError('');

    if (!selectedFile.name.endsWith('.json') && selectedFile.type !== 'application/json') {
      setError('Formato inválido. Por favor, envie um arquivo .json de formulário.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json || typeof json !== 'object') {
          throw new Error('Arquivo JSON inválido.');
        }

        const formTitle = json.title || selectedFile.name.replace(/\.json$/i, '') || 'Formulário Importado';
        setFile(selectedFile);
        setParsedData(json);
        setTitle(formTitle);
      } catch (err) {
        setError('Não foi possível ler o arquivo. Verifique se o JSON é válido.');
        setFile(null);
        setParsedData(null);
      }
    };
    reader.onerror = () => {
      setError('Erro ao carregar o arquivo do disco.');
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedData) {
      setError('Por favor, selecione um arquivo de formulário para importar.');
      return;
    }

    const cleanTitle = title.trim() || 'Formulário Importado';

    try {
      setLoading(true);
      setError('');
      await onImportSuccess({
        title: cleanTitle,
        data: parsedData,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao importar formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const questionCount = Array.isArray(parsedData?.questions) ? parsedData.questions.length : 0;
  const hasWelcome = !!parsedData?.welcome_screen && Object.keys(parsedData.welcome_screen).length > 0;
  const endingCount = Array.isArray(parsedData?.ending_screens) ? parsedData.ending_screens.length : 0;
  const hasTheme = !!parsedData?.theme && Object.keys(parsedData.theme).length > 0;

  return (
    <div className="import-form-modal-overlay" data-testid="import-form-modal-overlay">
      <div className="import-form-modal-card" data-testid="import-form-modal-card">
        {/* Botão de Fechar com atalho ESC */}
        <button
          type="button"
          className="import-form-close-btn"
          onClick={onClose}
          disabled={loading}
          title="Fechar (Esc)"
          data-testid="import-form-close-btn"
        >
          <X size={18} />
          <span className="esc-badge">ESC</span>
        </button>

        <form onSubmit={handleSubmit} className="import-form-content">
          <h2 className="import-form-title">Importar formulário</h2>
          <p className="import-form-subtitle">
            Faça upload do arquivo .json exportado para restaurar ou clonar a estrutura de perguntas, lógica e tema.
          </p>

          {/* Área de Seleção / Dropzone */}
          <div
            className={`import-dropzone ${isDragging ? 'dragging' : ''} ${parsedData ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="import-dropzone"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
              data-testid="import-file-input"
            />

            {parsedData ? (
              <div className="import-file-preview">
                <CheckCircle2 size={36} className="file-success-icon" />
                <span className="file-name">{file?.name}</span>
                <span className="file-hint">Clique ou arraste outro arquivo para trocar</span>
              </div>
            ) : (
              <div className="import-file-placeholder">
                <Upload size={32} className="upload-icon" />
                <span className="drop-main-text">Arraste o arquivo JSON aqui</span>
                <span className="drop-sub-text">ou clique para selecionar do seu computador</span>
              </div>
            )}
          </div>

          {/* Prévia dos dados importados e edição do título */}
          {parsedData && (
            <div className="import-preview-box" data-testid="import-preview-box">
              <label className="import-title-label">Título do novo formulário:</label>
              <input
                type="text"
                className="import-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do formulário"
                disabled={loading}
                data-testid="import-form-title-input"
              />

              <div className="import-stats-row">
                <span className="import-badge">
                  <FileText size={13} /> {questionCount} {questionCount === 1 ? 'pergunta' : 'perguntas'}
                </span>
                {hasWelcome && <span className="import-badge">Tela Inicial</span>}
                {endingCount > 0 && (
                  <span className="import-badge">
                    {endingCount} {endingCount === 1 ? 'tela final' : 'telas finais'}
                  </span>
                )}
                {hasTheme && <span className="import-badge">Tema Customizado</span>}
              </div>
            </div>
          )}

          {error && (
            <div className="import-error-msg" data-testid="import-error-msg">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="import-form-actions">
            <button
              type="submit"
              className="import-form-submit-btn"
              disabled={loading || !parsedData}
              data-testid="import-form-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="spinner-icon" size={18} />
                  <span>Importando...</span>
                </>
              ) : (
                'Importar formulário'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
