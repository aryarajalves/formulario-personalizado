import React from 'react';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import './LogicJumpConfig.css';

export default function LogicJumpConfig({ currentQuestion, allQuestions, onUpdateLogicJump }) {
  if (!currentQuestion) return null;

  const currentJump = currentQuestion.logic_jump || { rules: [], default_jump_to_question_id: null };
  const rules = currentJump.rules || [];

  // Perguntas possíveis para salto (exclui a própria pergunta)
  const targetCandidates = (allQuestions || []).filter(q => q.id !== currentQuestion.id);

  const handleAddRule = () => {
    const newRule = {
      id: `rule_${Date.now()}`,
      condition: 'equals',
      value: '',
      jump_to_question_id: targetCandidates[0]?.id || ''
    };
    onUpdateLogicJump({
      ...currentJump,
      rules: [...rules, newRule]
    });
  };

  const handleUpdateRule = (ruleId, field, val) => {
    const updatedRules = rules.map(r => {
      if (r.id === ruleId) {
        return { ...r, [field]: val };
      }
      return r;
    });
    onUpdateLogicJump({
      ...currentJump,
      rules: updatedRules
    });
  };

  const handleRemoveRule = (ruleId) => {
    onUpdateLogicJump({
      ...currentJump,
      rules: rules.filter(r => r.id !== ruleId)
    });
  };

  const handleDefaultJumpChange = (targetId) => {
    onUpdateLogicJump({
      ...currentJump,
      default_jump_to_question_id: targetId || null
    });
  };

  return (
    <div className="logic-jump-section" data-testid="logic-jump-section">
      <div className="config-section-title">
        <GitBranch size={13} />
        <span>LÓGICA CONDICIONAL / PULO</span>
      </div>

      <div className="logic-jump-rules-list">
        {rules.map((rule, idx) => (
          <div key={rule.id} className="logic-rule-card" data-testid={`logic-rule-${idx}`}>
            <div className="logic-rule-header">
              <span className="logic-rule-tag">Regra {idx + 1}</span>
              <button
                type="button"
                className="remove-logic-rule-btn"
                onClick={() => handleRemoveRule(rule.id)}
                data-testid={`remove-logic-rule-btn-${idx}`}
                title="Remover regra"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="logic-rule-body">
              <div className="logic-rule-row">
                <span className="logic-rule-prefix">Se a resposta for:</span>
                <select
                  value={rule.condition || 'equals'}
                  onChange={(e) => handleUpdateRule(rule.id, 'condition', e.target.value)}
                  className="logic-select"
                  data-testid={`logic-condition-select-${idx}`}
                >
                  <option value="equals">Igual a</option>
                  <option value="not_equals">Diferente de</option>
                  <option value="contains">Contém</option>
                  <option value="is_not_empty">Preenchida</option>
                </select>
              </div>

              {rule.condition !== 'is_not_empty' && (
                <input
                  type="text"
                  value={rule.value || ''}
                  onChange={(e) => handleUpdateRule(rule.id, 'value', e.target.value)}
                  placeholder="Valor esperado..."
                  className="config-text-input logic-value-input"
                  data-testid={`logic-value-input-${idx}`}
                />
              )}

              <div className="logic-rule-row">
                <span className="logic-rule-prefix">Pular para:</span>
                <select
                  value={rule.jump_to_question_id || ''}
                  onChange={(e) => handleUpdateRule(rule.id, 'jump_to_question_id', e.target.value)}
                  className="logic-select"
                  data-testid={`logic-target-select-${idx}`}
                >
                  <option value="">Selecione a pergunta...</option>
                  {targetCandidates.map((q, qIdx) => (
                    <option key={q.id} value={q.id}>
                      {qIdx + 1}. {q.title || `Pergunta ${qIdx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="add-logic-rule-btn"
        onClick={handleAddRule}
        data-testid="add-logic-rule-btn"
      >
        <Plus size={14} /> Adicionar Regra de Salto
      </button>

      <div className="config-form-group logic-default-jump-group">
        <label>Salto padrão (caso nenhuma regra combine):</label>
        <select
          value={currentJump.default_jump_to_question_id || ''}
          onChange={(e) => handleDefaultJumpChange(e.target.value)}
          className="logic-select"
          data-testid="logic-default-jump-select"
        >
          <option value="">Próxima pergunta em sequência</option>
          {targetCandidates.map((q, qIdx) => (
            <option key={q.id} value={q.id}>
              {qIdx + 1}. {q.title || `Pergunta ${qIdx + 1}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
