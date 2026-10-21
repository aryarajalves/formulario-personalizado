import React from 'react';
import { 
  FileText, 
  ExternalLink, 
  MoreVertical, 
  Edit3, 
  Download, 
  Trash2, 
  Loader2 
} from 'lucide-react';

export default function FormTableRow({
  form,
  isSelected,
  onToggleSelect,
  onEdit,
  onExport,
  isExporting,
  onDelete,
  isMenuOpen,
  onToggleMenu,
  formatDate
}) {
  return (
    <div 
      className={`form-row-item clickable-row ${isSelected ? 'selected-row' : ''}`}
      onClick={() => onEdit(form.id)}
      title="Clique para editar este formulário"
      data-testid={`form-item-${form.id}`}
    >
      {/* Checkbox de Seleção Individual */}
      <div className="col-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(form.id)}
          aria-label={`Selecionar formulário ${form.title}`}
          data-testid={`select-form-checkbox-${form.id}`}
          className="form-checkbox"
        />
      </div>

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
          onClick={onToggleMenu}
          data-testid={`form-menu-trigger-${form.id}`}
        >
          <MoreVertical size={16} />
        </button>

        {isMenuOpen && (
          <div className="form-dropdown-menu">
            <button
              type="button"
              className="dropdown-edit-btn"
              onClick={() => onEdit(form.id)}
              data-testid={`edit-form-btn-${form.id}`}
            >
              <Edit3 size={14} />
              <span>Editar</span>
            </button>
            <button
              type="button"
              className="dropdown-export-btn"
              onClick={() => onExport(form)}
              disabled={isExporting}
              data-testid={`export-form-btn-${form.id}`}
            >
              {isExporting ? (
                <Loader2 size={14} className="spinner-icon" />
              ) : (
                <Download size={14} />
              )}
              <span>Exportar</span>
            </button>
            <button
              type="button"
              className="dropdown-delete-btn"
              onClick={() => onDelete(form)}
              data-testid={`delete-form-btn-${form.id}`}
            >
              <Trash2 size={14} />
              <span>Excluir</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
