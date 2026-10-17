import React, { useState } from 'react';
import { 
  BarChart2, 
  Share2, 
  Loader2, 
  Eye, 
  X, 
  Calendar, 
  Mail, 
  Phone, 
  User, 
  CheckCircle2, 
  Clock, 
  Download,
  Filter,
  Printer
} from 'lucide-react';
import { printLeadPdf } from '../../../utils/pdfExport';

export default function ResultsTab({
  formId,
  formSlug,
  responses,
  responsesPage,
  responsesTotal,
  responsesTotalPages,
  responsesFilter = 'ALL',
  setResponsesFilter,
  responsesCounts = { all: 0, completed: 0, partial: 0 },
  loadingResponses,
  setResponsesPage,
  onGoToShare
}) {
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [exporting, setExporting] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleExportCsv = async () => {
    if (!formId) return;
    try {
      setExporting(true);
      const token = localStorage.getItem('auth_token');
      const statusParam = responsesFilter !== 'ALL' ? `?status=${responsesFilter}` : '';
      const response = await fetch(`/api/v1/forms/${formId}/responses/export${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao exportar arquivo.');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `respostas_${formSlug || 'formulario'}_${responsesFilter.toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message || 'Erro ao exportar respostas.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = () => {
    printLeadPdf(selectedResponse, formSlug, formatDate);
  };

  return (
    <div className="results-view-container" data-testid="results-view">
      <div className="results-inner">
        <div className="results-header">
          <div>
            <h2>Resultados do Formulário</h2>
            <p>Monitore contatos, veja respostas completas ou parciais e exporte seus leads.</p>
          </div>
          
          <div className="results-header-actions">
            <button
              type="button"
              className="export-csv-btn"
              onClick={handleExportCsv}
              disabled={exporting || responsesTotal === 0}
              data-testid="export-csv-btn"
              title="Baixar respostas filtradas em planilha CSV (compatível com Excel)"
            >
              {exporting ? <Loader2 size={14} className="spinner-icon" /> : <Download size={14} />}
              <span>{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros por Status */}
        <div className="results-filter-bar">
          <div className="filter-tabs-group">
            <button
              type="button"
              className={`filter-tab-btn ${responsesFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => {
                if (setResponsesFilter) setResponsesFilter('ALL');
                if (setResponsesPage) setResponsesPage(1);
              }}
              data-testid="filter-tab-all"
            >
              <span>Todas</span>
              <span className="filter-count-badge">{responsesCounts.all || responsesTotal || 0}</span>
            </button>

            <button
              type="button"
              className={`filter-tab-btn completed ${responsesFilter === 'CONCLUIDO' ? 'active' : ''}`}
              onClick={() => {
                if (setResponsesFilter) setResponsesFilter('CONCLUIDO');
                if (setResponsesPage) setResponsesPage(1);
              }}
              data-testid="filter-tab-completed"
            >
              <CheckCircle2 size={13} />
              <span>Concluídas (100%)</span>
              <span className="filter-count-badge">{responsesCounts.completed || 0}</span>
            </button>

            <button
              type="button"
              className={`filter-tab-btn partial ${responsesFilter === 'PARCIAL' ? 'active' : ''}`}
              onClick={() => {
                if (setResponsesFilter) setResponsesFilter('PARCIAL');
                if (setResponsesPage) setResponsesPage(1);
              }}
              data-testid="filter-tab-partial"
            >
              <Clock size={13} />
              <span>Parciais (Em andamento)</span>
              <span className="filter-count-badge">{responsesCounts.partial || 0}</span>
            </button>
          </div>
        </div>

        {loadingResponses ? (
          <div className="results-loading-box">
            <Loader2 className="spinner-icon" size={28} />
            <span>Carregando respostas do formulário...</span>
          </div>
        ) : responses.length === 0 ? (
          <div className="results-empty-card" data-testid="results-empty">
            <BarChart2 size={42} className="empty-chart-icon" />
            <h3>Nenhuma resposta encontrada neste filtro</h3>
            <p>
              {responsesFilter === 'PARCIAL' 
                ? 'Nenhum contato abandonou no meio do caminho até o momento.'
                : responsesFilter === 'CONCLUIDO'
                ? 'Nenhuma resposta 100% concluída registrada ainda.'
                : 'Envie o link do formulário na aba Compartilhar para começar a receber respostas.'}
            </p>
            {responsesFilter === 'ALL' && (
              <button
                type="button"
                className="go-to-share-btn"
                onClick={onGoToShare}
              >
                <Share2 size={15} />
                <span>Ir para Compartilhar</span>
              </button>
            )}
          </div>
        ) : (
          <div className="results-table-card" data-testid="results-table-container">
            <div className="results-table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Contato</th>
                    <th>E-mail</th>
                    <th>Telefone / WhatsApp</th>
                    <th>Status</th>
                    <th>Data de Envio</th>
                    <th>Respostas Detalhadas</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp, idx) => {
                    const allAnswers = resp.answers || [];
                    const previewAnswers = allAnswers.slice(0, 2);
                    const remainingCount = allAnswers.length - 2;
                    const isCompleted = resp.status === 'CONCLUIDO';

                    return (
                      <tr key={resp.id || idx}>
                        <td className="col-idx">{idx + 1}</td>
                        <td className="col-name">
                          <strong>{resp.contact_name || 'Anônimo'}</strong>
                        </td>
                        <td className="col-email">
                          {resp.contact_email ? (
                            <span className="email-badge">{resp.contact_email}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="col-phone">
                          {resp.contact_phone ? (
                            <span className="phone-badge">{resp.contact_phone}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="col-status">
                          {isCompleted ? (
                            <span className="status-pill-completed" title="Formulário respondido até o final">
                              <CheckCircle2 size={12} /> Concluído (100%)
                            </span>
                          ) : (
                            <span className="status-pill-partial" title="Preenchimento parcial">
                              <Clock size={12} /> Parcial ({resp.completion_percent ? `${Math.round(resp.completion_percent)}%` : 'Incompleto'})
                            </span>
                          )}
                        </td>
                        <td className="col-date">
                          {formatDate(resp.created_at)}
                        </td>
                        <td className="col-answers">
                          {allAnswers.length === 0 ? (
                            <span className="text-muted">Sem respostas adicionais</span>
                          ) : (
                            <div className="answers-chips-list">
                              {previewAnswers.map((ans, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="answer-chip"
                                  title={`${ans.question_title || `Pergunta ${aIdx + 1}`}: ${ans.answer}`}
                                >
                                  <strong>{ans.question_title || `Q${aIdx + 1}`}:</strong> {ans.answer || '—'}
                                </span>
                              ))}

                              {remainingCount > 0 && (
                                <button
                                  type="button"
                                  className="view-more-answers-btn"
                                  onClick={() => setSelectedResponse({ ...resp, rowIdx: idx + 1 })}
                                  data-testid={`view-more-btn-${idx}`}
                                  title="Clique para ver todas as respostas detalhadas"
                                >
                                  +{remainingCount} mais
                                </button>
                              )}

                              <button
                                type="button"
                                className="view-details-icon-btn"
                                onClick={() => setSelectedResponse({ ...resp, rowIdx: idx + 1 })}
                                data-testid={`view-details-btn-${idx}`}
                                title="Ver todos os detalhes desta resposta"
                              >
                                <Eye size={13} />
                                <span>Ver detalhes</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação de 20 itens por página */}
            <div className="results-pagination-footer">
              <div className="pagination-info">
                Mostrando <strong>{responses.length}</strong> de <strong>{responsesTotal}</strong> respostas (últimos 20 por página)
              </div>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={responsesPage <= 1}
                  onClick={() => setResponsesPage(prev => Math.max(1, prev - 1))}
                  data-testid="pagination-prev-btn"
                >
                  Anterior
                </button>
                <span className="pagination-page-indicator">
                  Página {responsesPage} de {responsesTotalPages}
                </span>
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={responsesPage >= responsesTotalPages}
                  onClick={() => setResponsesPage(prev => Math.min(responsesTotalPages, prev + 1))}
                  data-testid="pagination-next-btn"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE RESPOSTAS DETALHADAS */}
      {selectedResponse && (
        <div
          className="response-modal-overlay"
          data-testid="response-details-modal"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="response-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="response-modal-header">
              <div className="response-modal-title-box">
                <div className="response-modal-badge">
                  {selectedResponse.status === 'CONCLUIDO' ? (
                    <span className="status-pill-completed">
                      <CheckCircle2 size={13} /> Concluído (100%)
                    </span>
                  ) : (
                    <span className="status-pill-partial">
                      <Clock size={13} /> Parcial ({Math.round(selectedResponse.completion_percent || 0)}%)
                    </span>
                  )}
                  <span className="resp-num-tag">Resposta #{selectedResponse.rowIdx || 1}</span>
                </div>
                <h3>Detalhes da Resposta</h3>
              </div>
              <button
                type="button"
                className="response-modal-close-btn"
                onClick={() => setSelectedResponse(null)}
                data-testid="close-response-modal-btn"
                title="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="response-modal-body">
              {/* Metadados do Lead/Contato */}
              <div className="response-lead-info-grid">
                <div className="lead-info-item">
                  <span className="lead-info-label">
                    <User size={13} /> Contato
                  </span>
                  <span className="lead-info-val">
                    {selectedResponse.contact_name || 'Anônimo'}
                  </span>
                </div>
                <div className="lead-info-item">
                  <span className="lead-info-label">
                    <Mail size={13} /> E-mail
                  </span>
                  <span className="lead-info-val">
                    {selectedResponse.contact_email || '—'}
                  </span>
                </div>
                <div className="lead-info-item">
                  <span className="lead-info-label">
                    <Phone size={13} /> Telefone / WhatsApp
                  </span>
                  <span className="lead-info-val">
                    {selectedResponse.contact_phone || '—'}
                  </span>
                </div>
                <div className="lead-info-item">
                  <span className="lead-info-label">
                    <Calendar size={13} /> Data de Envio
                  </span>
                  <span className="lead-info-val">
                    {formatDate(selectedResponse.created_at)}
                  </span>
                </div>
              </div>

              {/* Lista Completa de Perguntas e Respostas */}
              <div className="response-qa-section">
                <h4>Perguntas e Respostas ({selectedResponse.answers?.length || 0})</h4>
                <div className="response-qa-list">
                  {(selectedResponse.answers || []).map((qa, qIndex) => (
                    <div key={qIndex} className="response-qa-card" data-testid={`modal-qa-item-${qIndex}`}>
                      <div className="response-qa-question">
                        <span className="qa-num">Q{qIndex + 1}</span>
                        <span className="qa-title">{qa.question_title || `Pergunta ${qIndex + 1}`}</span>
                      </div>
                      <div className="response-qa-answer">
                        <p>{qa.answer || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="response-modal-footer">
              <button
                type="button"
                className="response-modal-print-btn"
                onClick={handlePrintPdf}
                data-testid="print-lead-pdf-btn"
                title="Salvar ou Imprimir em PDF"
              >
                <Printer size={15} /> Imprimir / Salvar PDF
              </button>
              <button
                type="button"
                className="response-modal-primary-close-btn"
                onClick={() => setSelectedResponse(null)}
                data-testid="confirm-close-response-modal-btn"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
