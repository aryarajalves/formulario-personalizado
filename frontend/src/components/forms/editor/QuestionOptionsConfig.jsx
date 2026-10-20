import React from 'react';
import { ListFilter, Plus, Trash2 } from 'lucide-react';
import { 
  normalizeQuestionOptions, 
  CHOICE_QUESTION_TYPES, 
  normalizeFormFlows, 
  getQuestionDisplayTag, 
  DEFAULT_FLOW_ID 
} from '../../../utils/logicJump';
import './QuestionOptionsConfig.css';

export default function QuestionOptionsConfig({
  currentQuestion,
  allQuestions = [],
  flows = [],
  onUpdateOptions
}) {
  if (!currentQuestion || !CHOICE_QUESTION_TYPES.includes(currentQuestion.type)) {
    return null;
  }

  const options = normalizeQuestionOptions(currentQuestion);
  const isYesNo = currentQuestion.type === 'yes_no';
  const isImageChoice = currentQuestion.type === 'image_choice';
  const normalizedFlows = normalizeFormFlows({ flows });
  const currentFlowId = currentQuestion?.flow_id || DEFAULT_FLOW_ID;
  const targetFlowCandidates = normalizedFlows.filter(f => f.id !== currentFlowId);

  // Candidatos de destino para salto (exclui a própria pergunta)
  const targetCandidates = (allQuestions || []).filter(q => q.id !== currentQuestion.id);

  const handleUpdateOption = (optId, field, value) => {
    const updated = options.map(opt => {
      if (opt.id === optId) {
        const nextOpt = { ...opt, [field]: value };
        if (field === 'action') {
          if (value === 'jump' && !nextOpt.jump_to_question_id) {
            nextOpt.jump_to_question_id = targetCandidates[0]?.id || '';
          }
          if (value === 'jump_flow' && !nextOpt.jump_to_flow_id) {
            nextOpt.jump_to_flow_id = targetFlowCandidates[0]?.id || '';
          }
        }
        return nextOpt;
      }
      return opt;
    });
    onUpdateOptions(updated);
  };

  const handleAddOption = () => {
    const newId = `opt_${Date.now()}`;
    const nextIdx = options.length + 1;
    const newOption = {
      id: newId,
      label: `Opção ${nextIdx}`,
      image_url: isImageChoice ? '' : undefined,
      action: 'next',
      jump_to_question_id: null,
      jump_to_flow_id: null
    };
    onUpdateOptions([...options, newOption]);
  };

  const handleRemoveOption = (optId) => {
    if (options.length <= 1) return;
    const filtered = options.filter(opt => opt.id !== optId);
    onUpdateOptions(filtered);
  };

  return (
    <div className="question-options-config" data-testid="question-options-config">
      <div className="options-config-header">
        <ListFilter size={14} />
        <span>Opções & Condicionais de Escolha</span>
      </div>

      <p className="options-config-hint">
        Configure as alternativas disponíveis e o que acontece quando o usuário escolhe cada uma.
      </p>

      <div className="options-list">
        {options.map((opt, idx) => (
          <div key={opt.id} className="option-config-card" data-testid={`option-card-${idx}`}>
            <div className="option-card-top">
              <span className="option-badge">
                {String.fromCharCode(65 + (idx % 26))} - {isYesNo ? opt.label : `Opção ${idx + 1}`}
              </span>
              {!isYesNo && (
                <button
                  type="button"
                  className="remove-option-btn"
                  onClick={() => handleRemoveOption(opt.id)}
                  disabled={options.length <= 1}
                  title={options.length <= 1 ? 'Mínimo de 1 opção' : 'Excluir opção'}
                  data-testid={`remove-option-btn-${idx}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <input
              type="text"
              value={opt.label || ''}
              onChange={(e) => handleUpdateOption(opt.id, 'label', e.target.value)}
              placeholder="Texto da opção..."
              className="option-input-field"
              data-testid={`option-label-input-${idx}`}
            />

            {isImageChoice && (
              <input
                type="url"
                value={opt.image_url || ''}
                onChange={(e) => handleUpdateOption(opt.id, 'image_url', e.target.value)}
                placeholder="URL da imagem (ex: https://...)"
                className="option-input-field"
                data-testid={`option-image-input-${idx}`}
              />
            )}

            <div className="option-conditional-row">
              <span className="option-conditional-label">Se o usuário escolher esta opção:</span>
              <select
                value={opt.action || 'next'}
                onChange={(e) => handleUpdateOption(opt.id, 'action', e.target.value)}
                className="option-action-select"
                data-testid={`option-action-select-${idx}`}
              >
                <option value="next">➡️ Ir para próxima pergunta</option>
                <option value="jump_flow">🌿 Ir para outra ramificação...</option>
                <option value="jump">🔀 Pular para outra pergunta...</option>
                <option value="end">🏁 Finalizar formulário (Tela Final)</option>
              </select>

              {opt.action === 'jump_flow' && (
                <select
                  value={opt.jump_to_flow_id || ''}
                  onChange={(e) => handleUpdateOption(opt.id, 'jump_to_flow_id', e.target.value)}
                  className="option-target-select"
                  data-testid={`option-flow-select-${idx}`}
                >
                  <option value="">Selecione a ramificação de destino...</option>
                  {targetFlowCandidates.length === 0 ? (
                    <option value="" disabled>Nenhuma outra ramificação criada (Crie uma no menu lateral)</option>
                  ) : (
                    targetFlowCandidates.map((flow) => {
                      const flowQuestionsCount = (allQuestions || []).filter(q => (q.flow_id || DEFAULT_FLOW_ID) === flow.id).length;
                      return (
                        <option key={flow.id} value={flow.id}>
                          🌿 {flow.name || 'Ramificação'} ({flowQuestionsCount} {flowQuestionsCount === 1 ? 'questão' : 'questões'})
                        </option>
                      );
                    })
                  )}
                </select>
              )}

              {opt.action === 'jump' && (
                <select
                  value={opt.jump_to_question_id || ''}
                  onChange={(e) => handleUpdateOption(opt.id, 'jump_to_question_id', e.target.value)}
                  className="option-target-select"
                  data-testid={`option-target-select-${idx}`}
                >
                  <option value="">Selecione a pergunta de destino...</option>
                  {normalizedFlows.map(flow => {
                    const flowQuestions = targetCandidates.filter(q => (q.flow_id || DEFAULT_FLOW_ID) === flow.id);
                    if (!flowQuestions.length) return null;
                    return (
                      <optgroup key={flow.id} label={flow.name || 'Fluxo'}>
                        {flowQuestions.map(q => (
                          <option key={q.id} value={q.id}>
                            {getQuestionDisplayTag(q, allQuestions, normalizedFlows)} {q.title || 'Sem título'}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  <option value="END_SCREEN">🏁 Finalizar formulário (Tela Final)</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isYesNo && (
        <button
          type="button"
          className="add-option-btn"
          onClick={handleAddOption}
          data-testid="add-option-btn"
        >
          <Plus size={14} /> Adicionar Opção
        </button>
      )}
    </div>
  );
}
