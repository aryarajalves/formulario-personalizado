import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Loader2, 
  ArrowUpDown,
  LayoutGrid,
  List,
  Upload
} from 'lucide-react';
import CreateFormModal from './CreateFormModal';
import ImportFormModal from './ImportFormModal';
import FormEditor from './FormEditor';
import BulkDeleteModal from './modals/BulkDeleteModal';
import BulkActionBar from './management/BulkActionBar';
import FormTableRow from './management/FormTableRow';
import { useToast } from '../../context/ToastContext';
import './FormsManagement.css';

export default function FormsManagement({ onEditStateChange }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);

  // Estados para seleção e exclusão (Individual e Múltipla/Bulk)
  const [selectedFormIds, setSelectedFormIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // null | { mode: 'single', form } | { mode: 'bulk', ids: [] }
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Manipulação de seleção
  const handleToggleSelectForm = (id) => {
    setSelectedFormIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visibleIds = filteredForms.map((f) => f.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedFormIds.includes(id));
  const isIndeterminate = !isAllSelected && visibleIds.some((id) => selectedFormIds.includes(id));

  const handleSelectAllVisible = () => {
    if (isAllSelected) {
      setSelectedFormIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedFormIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Exclusão Unificada (Individual e Múltipla)
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('auth_token');

      if (deleteTarget.mode === 'single') {
        const formId = deleteTarget.form.id;
        const response = await fetch(`/api/v1/forms/${formId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Erro ao excluir formulário.');
        }

        setForms((prev) => prev.filter((f) => f.id !== formId));
        setSelectedFormIds((prev) => prev.filter((id) => id !== formId));
        addToast('Formulário removido com sucesso.', 'success');
      } else {
        const ids = deleteTarget.ids;
        const response = await fetch('/api/v1/forms/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ form_ids: ids })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Erro ao excluir formulários.');
        }

        const resData = await response.json();
        setForms((prev) => prev.filter((f) => !ids.includes(f.id)));
        setSelectedFormIds((prev) => prev.filter((id) => !ids.includes(id)));
        addToast(resData.message || `${ids.length} formulários excluídos com sucesso.`, 'success');
      }

      setDeleteTarget(null);
    } catch (err) {
      addToast(err.message || 'Erro ao excluir.', 'error');
    } finally {
      setDeleteLoading(false);
      setActiveDropdown(null);
    }
  };

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

  const deleteCount = deleteTarget?.mode === 'single' ? 1 : deleteTarget?.ids?.length || 0;
  const deleteSingleTitle = deleteTarget?.mode === 'single'
    ? deleteTarget?.form?.title
    : (deleteCount === 1 ? forms.find((f) => f.id === deleteTarget?.ids?.[0])?.title : null);

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

        {/* Barra de Ações em Massa (Bulk) */}
        <BulkActionBar
          selectedCount={selectedFormIds.length}
          onClearSelection={() => setSelectedFormIds([])}
          onOpenDeleteModal={() => setDeleteTarget({ mode: 'bulk', ids: [...selectedFormIds] })}
        />

        {/* Tabela / Lista de Formulários */}
        <div className="forms-table-card">
          <div className="forms-table-header">
            <div className="col-checkbox">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={handleSelectAllVisible}
                aria-label="Selecionar todos os formulários visíveis"
                data-testid="select-all-forms-checkbox"
                className="form-checkbox"
              />
            </div>
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
                <FormTableRow
                  key={form.id}
                  form={form}
                  isSelected={selectedFormIds.includes(form.id)}
                  onToggleSelect={handleToggleSelectForm}
                  onEdit={(id) => setEditingFormId(id)}
                  onExport={handleExportForm}
                  isExporting={exportingId === form.id}
                  onDelete={(f) => {
                    setActiveDropdown(null);
                    setDeleteTarget({ mode: 'single', form: f });
                  }}
                  isMenuOpen={activeDropdown === form.id}
                  onToggleMenu={() => setActiveDropdown(activeDropdown === form.id ? null : form.id)}
                  formatDate={formatDate}
                />
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

      {/* Modal Centralizado de Confirmação de Deleção (Individual e Bulk) */}
      <BulkDeleteModal
        isOpen={!!deleteTarget}
        count={deleteCount}
        singleFormTitle={deleteSingleTitle}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExecuteDelete}
      />
    </div>
  );
}
