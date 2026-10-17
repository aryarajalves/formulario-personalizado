import React from 'react';
import { 
  ArrowLeft, 
  Edit2, 
  Sliders, 
  Share2, 
  BarChart2, 
  Loader2 
} from 'lucide-react';
import QuestionTypePickerModal from './QuestionTypePickerModal';
import { useFormEditor } from './editor/useFormEditor';
import EditorSidebar from './editor/EditorSidebar';
import EditorCanvas from './editor/EditorCanvas';
import EditorConfigPanel from './editor/EditorConfigPanel';
import IntegrationsTab from './editor/IntegrationsTab';
import ShareTab from './editor/ShareTab';
import ResultsTab from './editor/ResultsTab';
import DeleteConfirmModal from './editor/DeleteConfirmModal';
import './FormEditor.css';

export default function FormEditor({ formId, onBack }) {
  const {
    form,
    loading,
    saving,
    deviceView,
    setDeviceView,
    selectedQuestionIndex,
    setSelectedQuestionIndex,
    activeItemType,
    setActiveItemType,
    selectedEndingIndex,
    setSelectedEndingIndex,
    activeTab,
    setActiveTab,
    editorTab,
    setEditorTab,
    webhookUrl,
    setWebhookUrl,
    testingWebhook,
    isTypePickerOpen,
    setIsTypePickerOpen,
    typePickerMode,
    editingQuestionTag,
    setEditingQuestionTag,
    isEditingTitle,
    setIsEditingTitle,
    titleInput,
    setTitleInput,
    copiedLink,
    responses,
    responsesPage,
    setResponsesPage,
    responsesTotal,
    responsesTotalPages,
    responsesFilter,
    setResponsesFilter,
    responsesCounts,
    loadingResponses,
    googleCalConnected,
    googleCalEmail,
    deleteConfirm,
    setDeleteConfirm,
    handleSaveForm,
    handleConnectGoogleCalendar,
    handleDisconnectGoogleCalendar,
    handleTestWebhook,
    handleAddQuestion,
    handleChangeQuestionType,
    openTypePickerForAdd,
    openTypePickerForChange,
    promptDeleteQuestion,
    promptDeleteEndingScreen,
    handleConfirmDelete,
    handleAddEndingScreen,
    handleUpdateCurrentEndingScreen,
    handleToggleWelcomeScreen,
    handleUpdateWelcomeScreen,
    handleUpdateCurrentQuestion,
    handleSaveTitle,
    handleUpdateTheme,
    copyShareLink
  } = useFormEditor(formId);


  if (loading || !form) {
    return (
      <div className="editor-loading-screen" data-testid="editor-loading">
        <Loader2 className="spinner-icon" size={32} />
        <span>Carregando editor de formulário...</span>
      </div>
    );
  }

  const currentQuestion = form?.questions?.[selectedQuestionIndex] || form?.questions?.[0];
  const currentEndingScreen = form?.ending_screens?.[selectedEndingIndex] || form?.ending_screens?.[0];

  return (
    <div className="form-editor-container" data-testid="form-editor-view">
      {/* Top Navbar do Editor */}
      <header className="editor-navbar">
        <div className="navbar-left">
          <button 
            type="button" 
            className="back-btn" 
            onClick={onBack}
            data-testid="editor-back-btn"
            title="Voltar aos Formulários"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="form-title-edit-area">
            {isEditingTitle ? (
              <input 
                type="text" 
                className="title-edit-input" 
                value={titleInput} 
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
              />
            ) : (
              <span className="editor-form-title" onClick={() => setIsEditingTitle(true)}>
                {form.title}
                <Edit2 size={13} className="edit-title-icon" />
              </span>
            )}
          </div>
        </div>

        {/* Abas Superiores Centrais */}
        <div className="navbar-center-tabs">
          <button 
            className={`nav-tab ${editorTab === 'editar' ? 'active' : ''}`} 
            type="button"
            onClick={() => setEditorTab('editar')}
            data-testid="tab-editar"
          >
            <Edit2 size={15} /> Editar
          </button>
          <button 
            className={`nav-tab ${editorTab === 'integrar' ? 'active' : ''}`} 
            type="button"
            onClick={() => setEditorTab('integrar')}
            data-testid="tab-integrar"
          >
            <Sliders size={15} /> Integrar
          </button>
          <button 
            className={`nav-tab ${editorTab === 'compartilhar' ? 'active' : ''}`} 
            type="button"
            onClick={() => setEditorTab('compartilhar')}
            data-testid="tab-compartilhar"
          >
            <Share2 size={15} /> Compartilhar
          </button>
          <button 
            className={`nav-tab ${editorTab === 'resultados' ? 'active' : ''}`} 
            type="button"
            onClick={() => setEditorTab('resultados')}
            data-testid="tab-resultados"
          >
            <BarChart2 size={15} /> Resultados
          </button>
        </div>

        <div className="navbar-right"></div>
      </header>

      {/* Renderização Condicional de Acordo com a Aba Selecionada */}
      {editorTab === 'integrar' ? (
        <IntegrationsTab
          formId={formId}
          webhookUrl={webhookUrl}
          setWebhookUrl={setWebhookUrl}
          saving={saving}
          testingWebhook={testingWebhook}
          googleCalConnected={googleCalConnected}
          googleCalEmail={googleCalEmail}
          onSaveWebhook={() => handleSaveForm(null, null, webhookUrl.trim())}
          onTestWebhook={handleTestWebhook}
          onConnectGoogleCalendar={handleConnectGoogleCalendar}
          onDisconnectGoogleCalendar={handleDisconnectGoogleCalendar}
        />
      ) : editorTab === 'compartilhar' ? (
        <ShareTab
          formSlug={form.slug}
          copiedLink={copiedLink}
          onCopyLink={copyShareLink}
        />
      ) : editorTab === 'resultados' ? (
        <ResultsTab
          formId={formId}
          formSlug={form?.slug}
          responses={responses}
          responsesPage={responsesPage}
          responsesTotal={responsesTotal}
          responsesTotalPages={responsesTotalPages}
          responsesFilter={responsesFilter}
          setResponsesFilter={setResponsesFilter}
          responsesCounts={responsesCounts}
          loadingResponses={loadingResponses}
          setResponsesPage={setResponsesPage}
          onGoToShare={() => setEditorTab('compartilhar')}
        />
      ) : (
        /* Área de Trabalho do Editor (3 colunas) */
        <div className="editor-workspace">
          {/* COLUNA ESQUERDA: Lista de Questões e Telas */}
          <EditorSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            form={form}
            activeItemType={activeItemType}
            setActiveItemType={setActiveItemType}
            selectedQuestionIndex={selectedQuestionIndex}
            setSelectedQuestionIndex={setSelectedQuestionIndex}
            selectedEndingIndex={selectedEndingIndex}
            setSelectedEndingIndex={setSelectedEndingIndex}
            handleToggleWelcomeScreen={handleToggleWelcomeScreen}
            openTypePickerForAdd={openTypePickerForAdd}
            promptDeleteQuestion={promptDeleteQuestion}
            handleAddEndingScreen={handleAddEndingScreen}
            promptDeleteEndingScreen={promptDeleteEndingScreen}
            handleUpdateTheme={handleUpdateTheme}
            saving={saving}
          />


          {/* COLUNA CENTRAL: Preview Interativo com seletores Desktop / Tablet / Celular */}
          <EditorCanvas
            deviceView={deviceView}
            setDeviceView={setDeviceView}
            activeItemType={activeItemType}
            setActiveItemType={setActiveItemType}
            form={form}
            currentQuestion={currentQuestion}
            currentEndingScreen={currentEndingScreen}
            selectedQuestionIndex={selectedQuestionIndex}
            setSelectedQuestionIndex={setSelectedQuestionIndex}
            editingQuestionTag={editingQuestionTag}
            setEditingQuestionTag={setEditingQuestionTag}
            handleUpdateWelcomeScreen={handleUpdateWelcomeScreen}
            handleUpdateCurrentEndingScreen={handleUpdateCurrentEndingScreen}
            handleUpdateCurrentQuestion={handleUpdateCurrentQuestion}
            handleSaveForm={handleSaveForm}
          />

          {/* COLUNA DIREITA: Painel de Configurações da Questão */}
          <EditorConfigPanel
            activeItemType={activeItemType}
            form={form}
            currentQuestion={currentQuestion}
            currentEndingScreen={currentEndingScreen}
            handleUpdateWelcomeScreen={handleUpdateWelcomeScreen}
            handleUpdateCurrentEndingScreen={handleUpdateCurrentEndingScreen}
            handleUpdateCurrentQuestion={handleUpdateCurrentQuestion}
            handleSaveForm={handleSaveForm}
            openTypePickerForChange={openTypePickerForChange}
          />
        </div>
      )}

      {/* Modal para Adicionar ou Trocar Tipo de Questão */}
      <QuestionTypePickerModal
        isOpen={isTypePickerOpen}
        onClose={() => setIsTypePickerOpen(false)}
        onSelectType={(typeItem) => {
          if (typePickerMode === 'change') {
            handleChangeQuestionType(typeItem);
          } else {
            handleAddQuestion(typeItem);
          }
        }}
      />

      {/* Popup de Confirmação de Exclusão */}
      <DeleteConfirmModal
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
