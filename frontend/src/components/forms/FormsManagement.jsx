import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ExternalLink, 
  MoreVertical, 
  FileText, 
  Trash2, 
  Loader2, 
  SlidersHorizontal,
  FolderPlus,
  ArrowUpDown,
  LayoutGrid,
  List,
  Edit3,
  Upload,
  Download
} from 'lucide-react';
import CreateFormModal from './CreateFormModal';
import ImportFormModal from './ImportFormModal';
import FormEditor from './FormEditor';
import { useToast } from '../../context/ToastContext';
import './FormsManagement.css';

export default function FormsManagement({ onEditStateChange }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [deleteConfirmForm, setDeleteConfirmForm] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (onEditStateChange) {
      onEditStateChange(!!editingFormId);
    }
  }, [editingFormId, onEditStateChange]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/forms', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Não foi possível carregar os formulários.');
      }

      const data = await response.json();
      setForms(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar formulários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCreateForm = async (title) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/v1/forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Erro ao criar o formulário.');
    }

    const newForm = await response.json();
    setForms((prev) => [newForm, ...prev]);
    addToast('Formulário criado com sucesso!', 'success');
    setEditingFormId(newForm.id);
  };

  const handleImportForm = async ({ title, data }) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/v1/forms/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, data }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Erro ao importar o formulário.');
    }

    const newForm = await response.json();
    setForms((prev) => [newForm, ...prev]);
    addToast('Formulário importado com sucesso!', 'success');
    setEditingFormId(newForm.id);
  };

  const handleExportForm = async (targetForm) => {
    try {
      setExportingId(targetForm.id);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/forms/${targetForm.id}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar formulário.');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (targetForm.title || 'formulario').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      a.download = `formulario_${safeTitle}_${targetForm.slug || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast('Formulário exportado com sucesso!', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao exportar formulário.', 'error');
    } finally {
      setExportingId(null);
      setActiveDropdown(null);
    }
  };

  const handleDeleteForm = async (formId) => {
    try {
      setDeletingId(formId);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/forms/${formId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir formulário.');
      }

      setForms((prev) => prev.filter((f) => f.id !== formId));
      addToast('Formulário removido com sucesso.', 'success');
      setDeleteConfirmForm(null);
    } catch (err) {
      addToast(err.message || 'Erro ao excluir.', 'error');
    } finally {
      setDeletingId(null);
      setActiveDropdown(null);
    }
  };

  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  if (editingFormId) {
    return (
      <FormEditor
        formId={editingFormId}
        onBack={() => {
          setEditingFormId(null);
          fetchForms();
        }}
      />
    );
  }

  return (
    <div className="forms-management-container" data-testid="forms-management-view">
      {/* Conteúdo Principal */}
      <main className="forms-content-area">
        {/* Top Header */}
        <div className="forms-header">
          <h1 className="forms-title">Todos os formulários</h1>
          <div className="forms-header-actions">
            <button
              type="button"
              className="import-form-btn"
              onClick={() => setIsImportModalOpen(true)}
              data-testid="open-import-form-modal-btn"
              title="Importar formulário a partir de arquivo JSON"
            >
              <Upload size={16} />
              <span>Importar formulário</span>
            </button>
            <button
              type="button"
              className="create-form-main-btn"
              onClick={() => setIsModalOpen(true)}
              data-testid="open-create-form-modal-btn"
            >
              <Plus size={18} />
              <span>Criar formulário</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="forms-filter-bar">
          <div className="search-input-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Pesquisar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-forms-input"
            />
          </div>

          <div className="filter-actions">
            <div className="sort-selector">
              <span>Data de última alteração</span>
            </div>
            <button className="icon-tool-btn" title="Ordenar">
              <ArrowUpDown size={16} />
            </button>
            <button className="icon-tool-btn active" title="Visualização em Lista">
              <List size={16} />
            </button>
            <button className="icon-tool-btn" title="Visualização em Grade">
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Tabela / Lista de Formulários */}
        <div className="forms-table-card">
          <div className="forms-table-header">
            <div className="col-info">FORMULÁRIO</div>
            <div className="col-responses">RESPOSTAS</div>
            <div className="col-completion">CONCLUSÃO</div>
            <div className="col-updated">ATUALIZADO EM</div>
            <div className="col-actions">AÇÕES</div>
          </div>

          {loading ? (
            <div className="forms-loading-state" data-testid="forms-loading">
              <Loader2 className="spinner-icon" size={28} />
              <span>Carregando formulários...</span>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="forms-empty-state" data-testid="forms-empty-state">
              <div className="empty-icon-box">
                <FileText size={36} />
              </div>
              <h3>Nenhum formulário encontrado</h3>
              <p>Comece criando seu primeiro formulário interativo agora mesmo.</p>
              <button
                type="button"
                className="empty-create-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={16} /> Criar formulário
              </button>
            </div>
          ) : (
            <div className="forms-list" data-testid="forms-list">
              {filteredForms.map((form) => (
                <div 
                  key={form.id} 
                  className="form-row-item clickable-row" 
                  onClick={() => setEditingFormId(form.id)}
                  title="Clique para editar este formulário"
                  data-testid={`form-item-${form.id}`}
                >
                  {/* Ícone e Título */}
                  <div className="form-info-col">
                    <div className="form-thumbnail">
                      <FileText size={20} />
                    </div>
                    <div className="form-text-details">
                      <div className="form-title-row">
                        <span className="form-name">{form.title}</span>
                        <span className="form-status-badge">{form.status || 'PUBLICADO'}</span>
                      </div>
                      <a
                        href={`/form/${form.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="form-link"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`form-public-link-${form.id}`}
                        title="Abrir formulário público"
                      >
                        {window.location.origin}/form/{form.slug}
                        <ExternalLink size={12} className="link-icon" />
                      </a>
                    </div>
                  </div>

                  {/* Respostas */}
                  <div className="form-responses-col">
                    <span>{form.responses_count > 0 ? form.responses_count : '—'}</span>
                  </div>

                  {/* Conclusão */}
                  <div className="form-completion-col">
                    <span>
                      {form.completion_rate > 0 ? `${form.completion_rate.toFixed(1)}%` : '0%'}
                    </span>
                  </div>

                  {/* Data de Atualização */}
                  <div className="form-updated-col">
                    <span>{formatDate(form.updated_at || form.created_at)}</span>
                  </div>

                  {/* Ações */}
                  <div className="form-actions-col" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="form-menu-trigger"
                      onClick={() => setActiveDropdown(activeDropdown === form.id ? null : form.id)}
                      data-testid={`form-menu-trigger-${form.id}`}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeDropdown === form.id && (
                      <div className="form-dropdown-menu">
                        <button
                          type="button"
                          className="dropdown-edit-btn"
                          onClick={() => {
                            setActiveDropdown(null);
                            setEditingFormId(form.id);
                          }}
                          data-testid={`edit-form-btn-${form.id}`}
                        >
                          <Edit3 size={14} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-export-btn"
                          onClick={() => handleExportForm(form)}
                          disabled={exportingId === form.id}
                          data-testid={`export-form-btn-${form.id}`}
                        >
                          {exportingId === form.id ? (
                            <Loader2 size={14} className="spinner-icon" />
                          ) : (
                            <Download size={14} />
                          )}
                          <span>Exportar</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-delete-btn"
                          onClick={() => setDeleteConfirmForm(form)}
                          data-testid={`delete-form-btn-${form.id}`}
                        >
                          <Trash2 size={14} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Criação */}
      <CreateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSuccess={handleCreateForm}
      />

      {/* Modal de Importação */}
      <ImportFormModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportForm}
      />

      {/* Modal Centralizado de Confirmação de Deleção com Backdrop Translúcido */}
      {deleteConfirmForm && (
        <div className="delete-confirm-overlay" data-testid="delete-confirm-overlay">
          <div className="delete-confirm-card" data-testid="delete-confirm-card">
            <h3>Excluir formulário?</h3>
            <p>
              Tem certeza que deseja excluir <strong>"{deleteConfirmForm.title}"</strong>? Esta ação
              não poderá ser desfeita.
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="cancel-delete-btn"
                onClick={() => setDeleteConfirmForm(null)}
                disabled={deletingId === deleteConfirmForm.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={() => handleDeleteForm(deleteConfirmForm.id)}
                disabled={deletingId === deleteConfirmForm.id}
                data-testid="confirm-delete-submit-btn"
              >
                {deletingId === deleteConfirmForm.id ? (
                  <>
                    <Loader2 className="spinner-icon" size={14} />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
