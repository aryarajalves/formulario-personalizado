import React from 'react';
import { Hand, Trash2, Plus, Star, ExternalLink } from 'lucide-react';
import DesignThemePanel from './DesignThemePanel';

export default function EditorSidebar({
  activeTab,
  setActiveTab,
  form,
  activeItemType,
  setActiveItemType,
  selectedQuestionIndex,
  setSelectedQuestionIndex,
  selectedEndingIndex,
  setSelectedEndingIndex,
  handleToggleWelcomeScreen,
  openTypePickerForAdd,
  promptDeleteQuestion,
  handleAddEndingScreen,
  promptDeleteEndingScreen,
  handleUpdateTheme,
  saving
}) {
  return (
    <aside className="editor-left-panel">
      <div className="left-panel-tabs">
        <button 
          className={`panel-subtab ${activeTab === 'conteudo' ? 'active' : ''}`}
          onClick={() => setActiveTab('conteudo')}
          data-testid="tab-sidebar-conteudo"
        >
          Conteúdo
        </button>
        <button 
          className={`panel-subtab ${activeTab === 'design' ? 'active' : ''}`}
          onClick={() => setActiveTab('design')}
          data-testid="tab-sidebar-design"
        >
          Design
        </button>
      </div>

      {activeTab === 'design' ? (
        <DesignThemePanel
          theme={form?.theme}
          onUpdateTheme={handleUpdateTheme}
          saving={saving}
        />
      ) : (
        <div className="questions-sidebar-content">
          {/* SEÇÃO TELA DE BOAS VINDAS */}
          <div className="welcome-screen-sidebar-group">

          <span className="sidebar-group-title">TELA DE BOAS VINDAS</span>
          {form?.welcome_screen?.enabled ? (
            <div
              className={`question-nav-item welcome-nav-item ${activeItemType === 'welcome_screen' ? 'active' : ''}`}
              onClick={() => setActiveItemType('welcome_screen')}
              data-testid="welcome-screen-nav-item"
            >
              <div className="welcome-screen-badge-icon">
                <Hand size={14} />
              </div>
              <span className="question-nav-label">
                {form?.welcome_screen?.title || 'Tela de boas vindas'}
              </span>
              <button
                type="button"
                className="delete-question-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleWelcomeScreen(false);
                }}
                title="Desativar tela de boas-vindas"
                data-testid="remove-welcome-screen-btn"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="add-question-dashed-btn add-welcome-btn"
              onClick={() => handleToggleWelcomeScreen(true)}
              data-testid="add-welcome-screen-btn"
            >
              <Plus size={14} /> Ativar tela de boas-vindas
            </button>
          )}
        </div>

        <span className="sidebar-group-title" style={{ marginTop: '16px' }}>QUESTÕES</span>

        <div className="questions-nav-list" data-testid="questions-list">
          {form?.questions?.map((q, idx) => (
            <div
              key={q.id || idx}
              className={`question-nav-item ${activeItemType === 'question' && selectedQuestionIndex === idx ? 'active' : ''}`}
              onClick={() => {
                setActiveItemType('question');
                setSelectedQuestionIndex(idx);
              }}
              data-testid={`question-item-${idx}`}
            >
              <span className="question-idx-badge">{idx + 1}</span>

              <span className="question-nav-label" title={q.title || `Questão ${idx + 1}`}>
                {q.title || `Questão ${idx + 1}`}
              </span>

              {q.required && (
                <Star 
                  size={13} 
                  className="question-required-star-icon" 
                  fill="#eab308" 
                  color="#eab308" 
                  data-testid={`required-star-${idx}`}
                  title="Obrigatória"
                />
              )}
              
              {form.questions.length > 1 && (
                <button
                  type="button"
                  className="delete-question-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    promptDeleteQuestion(idx);
                  }}
                  title="Excluir questão"
                  data-testid={`delete-question-btn-${idx}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* BOTÃO ADICIONAR QUESTÃO */}
        <button
          type="button"
          className="add-question-dashed-btn"
          onClick={openTypePickerForAdd}
          data-testid="add-question-btn"
        >
          <Plus size={15} /> Adicionar questão
        </button>

        {/* SEÇÃO TELAS FINAIS */}
        <div className="ending-screens-section">
          <span className="sidebar-group-title">TELAS FINAIS</span>
          <div className="questions-nav-list" data-testid="ending-screens-list">
            {(form?.ending_screens || []).map((screen, idx) => (
              <div
                key={screen.id || idx}
                className={`question-nav-item ending-nav-item ${activeItemType === 'ending_screen' && selectedEndingIndex === idx ? 'active' : ''}`}
                onClick={() => {
                  setActiveItemType('ending_screen');
                  setSelectedEndingIndex(idx);
                }}
                data-testid={`ending-item-${idx}`}
              >
                <div className="ending-screen-badge-icon">
                  <ExternalLink size={13} />
                </div>
                <span className="question-nav-label">{screen.title || 'Tela final'}</span>
                
                <button
                  type="button"
                  className="delete-question-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    promptDeleteEndingScreen(idx);
                  }}
                  title="Excluir tela final"
                  data-testid={`delete-ending-btn-${idx}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-question-dashed-btn add-ending-btn"
            onClick={handleAddEndingScreen}
            data-testid="add-ending-screen-btn"
          >
            <Plus size={15} /> Adicionar tela final
          </button>
        </div>
      </div>
      )}
    </aside>
  );
}

