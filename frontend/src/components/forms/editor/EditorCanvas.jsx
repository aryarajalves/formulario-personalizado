import React from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Hand, 
  ExternalLink, 
  Star, 
  Edit2, 
  ChevronDown, 
  Calendar, 
  Upload, 
  Check 
} from 'lucide-react';

export default function EditorCanvas({
  deviceView,
  setDeviceView,
  activeItemType,
  setActiveItemType,
  form,
  currentQuestion,
  currentEndingScreen,
  selectedQuestionIndex,
  setSelectedQuestionIndex,
  editingQuestionTag,
  setEditingQuestionTag,
  handleUpdateWelcomeScreen,
  handleUpdateCurrentEndingScreen,
  handleUpdateCurrentQuestion,
  handleSaveForm
}) {
  return (
    <main className="editor-center-canvas">
      <div className="device-switcher-bar">
        <button 
          className={`device-btn ${deviceView === 'desktop' ? 'active' : ''}`}
          onClick={() => setDeviceView('desktop')}
        >
          <Monitor size={15} /> Desktop
        </button>
        <button 
          className={`device-btn ${deviceView === 'tablet' ? 'active' : ''}`}
          onClick={() => setDeviceView('tablet')}
        >
          <Tablet size={15} /> Tablet
        </button>
        <button 
          className={`device-btn ${deviceView === 'celular' ? 'active' : ''}`}
          onClick={() => setDeviceView('celular')}
        >
          <Smartphone size={15} /> Celular
        </button>
      </div>

      <div className={`canvas-screen-mockup view-${deviceView}`}>
        <div className="mockup-window-header">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>

        {/* Conteúdo da Questão Selecionada, Tela Final ou Tela de Boas-Vindas */}
        <div className="mockup-body">
          {activeItemType === 'welcome_screen' ? (
            <div className="welcome-screen-preview-box" data-testid="welcome-screen-preview-box">
              <div className="welcome-preview-badge">
                <Hand size={16} /> Tela de Boas-Vindas
              </div>

              <input
                type="text"
                className="interactive-question-title-input welcome-title-input"
                value={form?.welcome_screen?.title || ''}
                onChange={(e) => handleUpdateWelcomeScreen('title', e.target.value)}
                onBlur={() => handleSaveForm()}
                placeholder="Título da tela de boas-vindas..."
                data-testid="welcome-screen-title-input"
              />

              <textarea
                className="interactive-ending-desc-input welcome-desc-input"
                value={form?.welcome_screen?.description || ''}
                onChange={(e) => handleUpdateWelcomeScreen('description', e.target.value)}
                onBlur={() => handleSaveForm()}
                placeholder="Descreva uma introdução cativante para os respondentes antes de iniciarem..."
                rows={4}
                data-testid="welcome-screen-desc-input"
              />

              <div className="welcome-preview-action-btn-wrap">
                <button
                  type="button"
                  className="welcome-preview-action-btn"
                  onClick={() => {
                    setActiveItemType('question');
                    setSelectedQuestionIndex(0);
                  }}
                  data-testid="welcome-preview-start-btn"
                >
                  <span>{form?.welcome_screen?.button_text || 'COMEÇAR FORMULÁRIO'}</span>
                </button>
                <span className="press-enter-hint">Pressione <strong>Enter ↵</strong></span>
              </div>
            </div>
          ) : activeItemType === 'ending_screen' ? (
            <div className="ending-screen-preview-box" data-testid="ending-screen-preview-box">
              <div className="ending-preview-badge">
                <ExternalLink size={16} /> Tela Final
              </div>
              
              <input
                type="text"
                className="interactive-question-title-input"
                value={currentEndingScreen?.title || ''}
                onChange={(e) => handleUpdateCurrentEndingScreen('title', e.target.value)}
                onBlur={() => handleSaveForm()}
                placeholder="Recebemos sua aplicação"
                data-testid="ending-screen-title-input"
              />

              <textarea
                className="interactive-ending-desc-input"
                value={currentEndingScreen?.description || ''}
                onChange={(e) => handleUpdateCurrentEndingScreen('description', e.target.value)}
                onBlur={() => handleSaveForm()}
                placeholder="Obrigado por responder. Descreva o que o usuário deve fazer em seguida..."
                rows={3}
                data-testid="ending-screen-desc-input"
              />

              <div className="ending-preview-action-btn-wrap">
                <a
                  href={currentEndingScreen?.button_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ending-preview-action-btn"
                  onClick={(e) => e.preventDefault()}
                >
                  <span>{currentEndingScreen?.button_text || 'Acessar nosso site'}</span>
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ) : (
            <div className="question-preview-box">
              <div className="question-header-tag-row">
                {editingQuestionTag ? (
                  <input
                    type="text"
                    className="interactive-question-tag-input"
                    value={currentQuestion?.tag !== undefined ? currentQuestion.tag : `${selectedQuestionIndex + 1} →`}
                    onChange={(e) => handleUpdateCurrentQuestion('tag', e.target.value)}
                    onBlur={() => {
                      setEditingQuestionTag(false);
                      handleSaveForm();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingQuestionTag(false);
                        handleSaveForm();
                      }
                    }}
                    autoFocus
                    data-testid="interactive-question-tag-input"
                  />
                ) : (
                  <span 
                    className="question-number-tag editable" 
                    onClick={() => setEditingQuestionTag(true)}
                    title="Clique para editar o prefixo/nome superior"
                    data-testid="interactive-question-tag-label"
                  >
                    {currentQuestion?.tag !== undefined ? currentQuestion.tag : `${selectedQuestionIndex + 1} →`}
                    <Edit2 size={11} className="tag-edit-pencil" />
                  </span>
                )}

                {currentQuestion?.required && (
                  <span className="question-tag-star-badge" title="Questão obrigatória" data-testid="question-tag-star">
                    <Star size={13} fill="#eab308" color="#eab308" />
                    <span className="tag-star-text">Obrigatória</span>
                  </span>
                )}
              </div>
              
              <input
                type="text"
                className="interactive-question-title-input"
                value={currentQuestion?.title || ''}
                onChange={(e) => handleUpdateCurrentQuestion('title', e.target.value)}
                onBlur={() => handleSaveForm()}
                placeholder="Escreva a sua pergunta aqui..."
                data-testid="current-question-title-input"
              />

              <div className="interactive-answer-preview">
                {/* Renderizador Dinâmico Baseado no Tipo da Questão */}
                {currentQuestion?.type === 'multiple_choice' && (
                  <div className="preview-options-list">
                    {['Opção A', 'Opção B', 'Opção C'].map((opt, i) => (
                      <div key={i} className="preview-choice-item">
                        <span className="choice-key">{String.fromCharCode(65 + i)}</span>
                        <span className="choice-label">{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion?.type === 'yes_no' && (
                  <div className="preview-yes-no-row">
                    <div className="preview-choice-item yes-item">
                      <span className="choice-key">Y</span>
                      <span className="choice-label">Sim</span>
                    </div>
                    <div className="preview-choice-item no-item">
                      <span className="choice-key">N</span>
                      <span className="choice-label">Não</span>
                    </div>
                  </div>
                )}

                {currentQuestion?.type === 'dropdown' && (
                  <div className="preview-dropdown-box">
                    <span>Selecione uma opção...</span>
                    <ChevronDown size={18} />
                  </div>
                )}

                {currentQuestion?.type === 'rating' && (
                  <div className="preview-rating-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div key={star} className="preview-star-box">
                        <span className="star-icon">★</span>
                        <span className="star-num">{star}</span>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion?.type === 'opinion_scale' && (
                  <div className="preview-scale-row">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <div key={num} className="preview-scale-item">
                        <span>{num}</span>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion?.type === 'nps' && (
                  <div className="preview-nps-container">
                    <div className="preview-scale-row">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <div key={num} className={`preview-scale-item nps-${num <= 6 ? 'detractor' : num <= 8 ? 'passive' : 'promoter'}`}>
                          <span>{num}</span>
                        </div>
                      ))}
                    </div>
                    <div className="nps-labels-row">
                      <span>Nada provável</span>
                      <span>Extremamente provável</span>
                    </div>
                  </div>
                )}

                {currentQuestion?.type === 'file_upload' && (
                  <div className="preview-upload-box">
                    <Upload size={28} className="upload-icon" />
                    <span className="upload-title">Arraste e solte o arquivo aqui</span>
                    <span className="upload-sub">ou clique para selecionar do computador</span>
                  </div>
                )}

                {currentQuestion?.type === 'long_text' && (
                  <textarea
                    disabled
                    placeholder={currentQuestion?.placeholder || 'Escreva sua resposta longa aqui...'}
                    className="mockup-answer-textarea"
                    rows={3}
                  />
                )}

                {currentQuestion?.type === 'date' && (
                  <div className="preview-date-box">
                    <Calendar size={18} />
                    <input
                      type="text"
                      disabled
                      placeholder="DD / MM / AAAA"
                      className="mockup-answer-input date-input"
                    />
                  </div>
                )}

                {currentQuestion?.type === 'phone' && (
                  <div className="preview-phone-box">
                    <span className="phone-country">🇧🇷 +55</span>
                    <input
                      type="text"
                      disabled
                      placeholder={currentQuestion?.placeholder || '(11) 99999-9999'}
                      className="mockup-answer-input"
                    />
                  </div>
                )}

                {currentQuestion?.type === 'website' && (
                  <div className="preview-website-box">
                    <span className="website-prefix">https://</span>
                    <input
                      type="text"
                      disabled
                      placeholder={currentQuestion?.placeholder || 'seusite.com.br'}
                      className="mockup-answer-input"
                    />
                  </div>
                )}

                {currentQuestion?.type === 'google_calendar' && (
                  <div className="preview-google-cal-box">
                    <div className="preview-cal-header">
                      <Calendar size={20} className="text-blue-500" />
                      <span>Agendamento via Google Agenda</span>
                    </div>
                    <div className="preview-cal-action-btn">
                      <span>Escolha um dia e horário disponível na agenda</span>
                    </div>
                  </div>
                )}

                {/* Fallback padrão para Texto Curto, Número, Email, etc. */}
                {!['multiple_choice', 'yes_no', 'dropdown', 'rating', 'file_upload', 'long_text', 'date', 'phone', 'website', 'google_calendar'].includes(currentQuestion?.type) && (
                  <input
                    type={currentQuestion?.type === 'number' ? 'number' : currentQuestion?.type === 'email' ? 'email' : 'text'}
                    disabled
                    placeholder={currentQuestion?.placeholder || (currentQuestion?.type === 'email' ? 'exemplo@dominio.com' : currentQuestion?.type === 'number' ? '0' : 'Sua resposta aqui...')}
                    className="mockup-answer-input"
                  />
                )}
              </div>

              <div className="preview-submit-btn-row">
                <button type="button" className="mockup-next-btn">
                  OK <Check size={14} />
                </button>
                <span className="press-enter-hint">pressione <strong>Enter ↵</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
