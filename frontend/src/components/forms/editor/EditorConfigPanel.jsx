import React from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { QUESTION_TYPES } from '../QuestionTypePickerModal';
import QuestionOptionsConfig from './QuestionOptionsConfig';
import { CHOICE_QUESTION_TYPES, normalizeFormFlows } from '../../../utils/logicJump';

export default function EditorConfigPanel({
  activeItemType,
  form,
  currentQuestion,
  currentEndingScreen,
  handleUpdateWelcomeScreen,
  handleUpdateCurrentEndingScreen,
  handleUpdateCurrentQuestion,
  handleSaveForm,
  openTypePickerForChange
}) {
  return (
    <aside className="editor-right-panel">
      <div className="right-panel-body">
        {activeItemType === 'welcome_screen' ? (
          <div className="welcome-config-group" data-testid="welcome-config-group">
            <div className="config-form-group">
              <label>Tipo de Tela</label>
              <div className="config-type-badge">
                <span>Tela de boas vindas</span>
              </div>
            </div>

            <div className="config-section-title">CONFIGURAÇÕES</div>

            <div className="config-form-group">
              <label>Texto do Botão de Início</label>
              <input
                type="text"
                value={form?.welcome_screen?.button_text || ''}
                onChange={(e) => handleUpdateWelcomeScreen('button_text', e.target.value)}
                className="config-text-input"
                placeholder="Ex: COMEÇAR FORMULÁRIO"
                data-testid="welcome-button-text-input"
              />
              <span className="webhook-field-hint" style={{ marginTop: '6px', display: 'block' }}>
                Texto do botão que leva o respondente da introdução para a primeira pergunta.
              </span>
            </div>
          </div>
        ) : activeItemType === 'ending_screen' ? (
          <div className="ending-config-group" data-testid="ending-config-group">
            <div className="config-form-group">
              <label>Tipo de Tela</label>
              <div className="config-type-badge">
                <span>Tela Final</span>
              </div>
            </div>

            <div className="config-section-title">REDIRECIONAMENTO & BOTÃO</div>

            <div className="config-form-group">
              <label>Texto do Botão de Ação</label>
              <input
                type="text"
                value={currentEndingScreen?.button_text || ''}
                onChange={(e) => handleUpdateCurrentEndingScreen('button_text', e.target.value)}
                className="config-text-input"
                placeholder="Ex: Acessar nosso site"
                data-testid="ending-button-text-input"
              />
            </div>

            <div className="config-form-group">
              <label>Link de Redirecionamento (URL)</label>
              <input
                type="url"
                value={currentEndingScreen?.button_url || ''}
                onChange={(e) => handleUpdateCurrentEndingScreen('button_url', e.target.value)}
                className="config-text-input"
                placeholder="https://seusite.com.br/obrigado"
                data-testid="ending-button-url-input"
              />
              <span className="webhook-field-hint" style={{ marginTop: '6px', display: 'block' }}>
                O respondente poderá clicar neste botão para ser redirecionado para outra página externa.
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="config-form-group">
              <div className="config-label-row">
                <label>Tipo</label>
                <button
                  type="button"
                  className="config-change-type-btn"
                  onClick={openTypePickerForChange}
                  data-testid="change-question-type-btn"
                  title="Alterar o tipo desta questão"
                >
                  <RefreshCw size={12} /> Trocar tipo
                </button>
              </div>
              <div 
                className="config-type-badge clickable" 
                onClick={openTypePickerForChange}
                data-testid="config-type-badge-clickable"
                title="Clique para trocar o tipo da questão"
              >
                <span>{QUESTION_TYPES.find(t => t.id === currentQuestion?.type)?.label || currentQuestion?.type || 'Texto curto'}</span>
                <ChevronDown size={14} className="config-type-badge-arrow" />
              </div>
            </div>

            <div className="config-form-group">
              <label>ID da Questão</label>
              <input
                type="text"
                readOnly
                value={currentQuestion?.id || ''}
                className="config-readonly-input"
              />
            </div>

            <div className="config-form-group">
              <label>Ramificação / Fluxo</label>
              <select
                className="config-text-input"
                value={currentQuestion?.flow_id || 'default'}
                onChange={(e) => {
                  handleUpdateCurrentQuestion('flow_id', e.target.value);
                }}
                data-testid="question-flow-select"
              >
                {normalizeFormFlows(form?.flows).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="config-section-title">CONFIGURAÇÕES</div>

            {currentQuestion?.type !== 'statement' && (
              <div className="config-toggle-row">
                <span>Resposta obrigatória</span>
                <input
                  type="checkbox"
                  checked={!!currentQuestion?.required}
                  onChange={(e) => {
                    handleUpdateCurrentQuestion('required', e.target.checked);
                  }}
                  data-testid="question-required-checkbox"
                />
              </div>
            )}

            <div className="config-form-group" style={{ marginTop: '16px' }}>
              <label>{currentQuestion?.type === 'statement' ? 'Título da Mensagem' : 'Título da Pergunta'}</label>
              <input
                type="text"
                value={currentQuestion?.title || ''}
                onChange={(e) => handleUpdateCurrentQuestion('title', e.target.value)}
                className="config-text-input"
                placeholder={currentQuestion?.type === 'statement' ? 'Ex: Obrigado pelo seu tempo' : 'Ex: Qual é o seu e-mail?'}
                data-testid="config-question-title-input"
              />
            </div>

            <div className="config-form-group" style={{ marginTop: '16px' }}>
              <label>{currentQuestion?.type === 'statement' ? 'Texto da Mensagem' : 'Placeholder / Dica'}</label>
              {currentQuestion?.type === 'statement' ? (
                <textarea
                  value={currentQuestion?.description || currentQuestion?.placeholder || ''}
                  onChange={(e) => {
                    handleUpdateCurrentQuestion('description', e.target.value);
                    handleUpdateCurrentQuestion('placeholder', e.target.value);
                  }}
                  className="config-text-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Escreva a mensagem exibida na tela ao usuário..."
                  data-testid="config-statement-description-input"
                />
              ) : (
                <input
                  type="text"
                  value={currentQuestion?.placeholder || ''}
                  onChange={(e) => handleUpdateCurrentQuestion('placeholder', e.target.value)}
                  className="config-text-input"
                  placeholder="Ex: Digite seu telefone..."
                />
              )}
            </div>

            {currentQuestion?.type === 'statement' && (
              <div className="config-form-group" style={{ marginTop: '16px' }}>
                <label>Texto do Botão de Término</label>
                <input
                  type="text"
                  value={currentQuestion?.button_text || 'Finalizar'}
                  onChange={(e) => handleUpdateCurrentQuestion('button_text', e.target.value)}
                  className="config-text-input"
                  placeholder="Ex: Finalizar"
                  data-testid="config-statement-btn-input"
                />
              </div>
            )}

            {CHOICE_QUESTION_TYPES.includes(currentQuestion?.type) && (
              <QuestionOptionsConfig
                currentQuestion={currentQuestion}
                allQuestions={form?.questions || []}
                flows={form?.flows || []}
                onUpdateOptions={(newOptions) => {
                  handleUpdateCurrentQuestion('options', newOptions);
                }}
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
}
