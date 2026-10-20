import React, { useState } from 'react';
import { GitBranch, GitFork, Trash2, Plus, Star, ChevronUp, ChevronDown, GripVertical, Edit2, Check } from 'lucide-react';
import { normalizeFormFlows, getQuestionBadgeText, DEFAULT_FLOW_ID } from '../../../utils/logicJump';
import './FlowBranchSection.css';

export default function FlowBranchSection({
  form,
  activeItemType,
  setActiveItemType,
  selectedQuestionIndex,
  setSelectedQuestionIndex,
  openTypePickerForAdd,
  promptDeleteQuestion,
  handleMoveQuestion,
  handleAddFlow,
  handleRenameFlow,
  promptDeleteFlow
}) {
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [editingFlowName, setEditingFlowName] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const flows = normalizeFormFlows(form?.flows);
  const questions = form?.questions || [];

  const handleStartRename = (flow) => {
    setEditingFlowId(flow.id);
    setEditingFlowName(flow.name);
  };

  const handleSaveRename = (flowId) => {
    if (editingFlowName.trim() && handleRenameFlow) {
      handleRenameFlow(flowId, editingFlowName.trim());
    }
    setEditingFlowId(null);
  };

  return (
    <div className="flow-branch-container" data-testid="flow-branches-container">
      {flows.map((flow, flowIndex) => {
        const isDefault = flow.id === DEFAULT_FLOW_ID;
        const questionsInFlow = questions
          .map((q, idx) => ({ q, globalIdx: idx }))
          .filter(item => (item.q.flow_id || DEFAULT_FLOW_ID) === flow.id);

        return (
          <div
            key={flow.id}
            className={`flow-branch-block ${isDefault ? 'is-main' : 'is-alternate'}`}
            data-testid={`flow-branch-${flow.id}`}
          >
            <div className="flow-branch-header">
              <div className="flow-branch-title-area">
                {isDefault ? (
                  <GitBranch size={14} className="flow-branch-icon" />
                ) : (
                  <GitFork size={14} className="flow-branch-icon" />
                )}

                {editingFlowId === flow.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                    <input
                      type="text"
                      className="flow-branch-name-input"
                      value={editingFlowName}
                      autoFocus
                      onChange={(e) => setEditingFlowName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(flow.id);
                        if (e.key === 'Escape') setEditingFlowId(null);
                      }}
                      data-testid={`flow-name-input-${flow.id}`}
                    />
                    <button
                      type="button"
                      className="flow-branch-edit-btn"
                      onClick={() => handleSaveRename(flow.id)}
                      title="Salvar nome"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="flow-branch-name" title={flow.name}>
                    {flow.name}
                  </span>
                )}
              </div>

              <div className="flow-branch-meta">
                <span className="flow-branch-count-badge" title="Total de questões nesta ramificação">
                  {questionsInFlow.length} {questionsInFlow.length === 1 ? 'questão' : 'questões'}
                </span>

                {!isDefault && editingFlowId !== flow.id && (
                  <button
                    type="button"
                    className="flow-branch-edit-btn"
                    onClick={() => handleStartRename(flow)}
                    title="Renomear ramificação"
                    data-testid={`rename-flow-btn-${flow.id}`}
                  >
                    <Edit2 size={12} />
                  </button>
                )}

                {!isDefault && (
                  <button
                    type="button"
                    className="flow-branch-delete-btn"
                    onClick={() => promptDeleteFlow(flow.id)}
                    title="Excluir ramificação"
                    data-testid={`delete-flow-btn-${flow.id}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Questões Desta Ramificação */}
            <div className="flow-branch-questions-list">
              {questionsInFlow.length === 0 ? (
                <div className="flow-branch-empty">Nenhuma questão nesta ramificação</div>
              ) : (
                questionsInFlow.map(({ q, globalIdx }, localIdx) => {
                  const badgeText = getQuestionBadgeText(q, questions, flows);
                  const isSelected = activeItemType === 'question' && selectedQuestionIndex === globalIdx;

                  return (
                    <div
                      key={q.id || globalIdx}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(globalIdx));
                        setDraggedIdx(globalIdx);
                      }}
                      onDragEnd={() => {
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIdx(globalIdx);
                      }}
                      onDragLeave={() => {
                        setDragOverIdx(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                        if (!isNaN(fromIdx) && fromIdx !== globalIdx && handleMoveQuestion) {
                          handleMoveQuestion(fromIdx, globalIdx);
                        }
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      className={`question-nav-item ${isSelected ? 'active' : ''} ${draggedIdx === globalIdx ? 'is-dragging' : ''} ${dragOverIdx === globalIdx ? 'drag-over' : ''}`}
                      onClick={() => {
                        setActiveItemType('question');
                        setSelectedQuestionIndex(globalIdx);
                      }}
                      data-testid={`question-item-${globalIdx}`}
                    >
                      <div className="drag-handle-icon" title="Arraste para mover de posição">
                        <GripVertical size={13} />
                      </div>

                      <span className="question-idx-badge">{badgeText}</span>

                      <span className="question-nav-label" title={q.title || `Questão ${badgeText}`}>
                        {q.title || `Questão ${badgeText}`}
                      </span>

                      {q.required && (
                        <Star
                          size={13}
                          className="question-required-star-icon"
                          fill="#eab308"
                          color="#eab308"
                          data-testid={`required-star-${globalIdx}`}
                          title="Obrigatória"
                        />
                      )}

                      <div className="question-reorder-controls" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="reorder-arrow-btn"
                          disabled={localIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (localIdx > 0 && handleMoveQuestion) {
                              const targetGlobalIdx = questionsInFlow[localIdx - 1].globalIdx;
                              handleMoveQuestion(globalIdx, targetGlobalIdx);
                            }
                          }}
                          title="Mover questão para cima"
                          data-testid={`move-question-up-${globalIdx}`}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="reorder-arrow-btn"
                          disabled={localIdx === questionsInFlow.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (localIdx < questionsInFlow.length - 1 && handleMoveQuestion) {
                              const targetGlobalIdx = questionsInFlow[localIdx + 1].globalIdx;
                              handleMoveQuestion(globalIdx, targetGlobalIdx);
                            }
                          }}
                          title="Mover questão para baixo"
                          data-testid={`move-question-down-${globalIdx}`}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          className="delete-question-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            promptDeleteQuestion(globalIdx);
                          }}
                          title="Excluir questão"
                          data-testid={`delete-question-btn-${globalIdx}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Botão de Adicionar Questão nesta Ramificação */}
            <button
              type="button"
              className="flow-add-question-btn"
              onClick={() => openTypePickerForAdd(flow.id)}
              data-testid={isDefault ? "add-question-btn" : `add-question-flow-btn-${flow.id}`}
            >
              <Plus size={13} /> Adicionar questão em {flow.name}
            </button>
          </div>
        );
      })}

      {/* Botão Criar Nova Ramificação */}
      <button
        type="button"
        className="add-flow-branch-btn"
        onClick={() => handleAddFlow()}
        data-testid="add-new-branch-btn"
      >
        <GitFork size={15} /> + Nova Ramificação / Fluxo
      </button>
    </div>
  );
}
