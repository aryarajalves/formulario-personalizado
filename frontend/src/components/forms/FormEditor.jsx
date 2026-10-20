import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Edit2, 
  Sliders, 
  Share2, 
  BarChart2, 
  Loader2,
  List,
  Eye,
  Settings,
  Download,
  Save
} from 'lucide-react';
import QuestionTypePickerModal from './QuestionTypePickerModal';
import { useToast } from '../../context/ToastContext';
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
    hasUnsavedChanges,
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
    handleManualSave,
    handleConnectGoogleCalendar,
    handleDisconnectGoogleCalendar,
    handleTestWebhook,
    handleAddQuestion,
    handleChangeQuestionType,
    openTypePickerForAdd,
    openTypePickerForChange,
    handleAddFlow,
    handleRenameFlow,
    promptDeleteFlow,
    handleMoveQuestionToFlow,
    promptDeleteQuestion,
    promptDeleteEndingScreen,
    handleConfirmDelete,
    handleAddEndingScreen,
    handleMoveQuestion,
    handleUpdateCurrentEndingScreen,
    handleToggleWelcomeScreen,
    promptDeleteWelcomeScreen,
    handleUpdateWelcomeScreen,
    handleUpdateCurrentQuestion,
    handleSaveTitle,
    handleUpdateTheme,
    copyShareLink
  } = useFormEditor(formId);

  const { addToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [mobileEditorSection, setMobileEditorSection] = useState('questions');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/v1/forms/${formId}/export`, {
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
      const safeTitle = (form?.title || 'formulario').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      a.download = `formulario_${safeTitle}_${form?.slug || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast('Formulário exportado com sucesso!', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao exportar formulário.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

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

        <div className="navbar-right">
          <button
            type="button"
            className="editor-export-btn"
            onClick={handleExport}
            disabled={isExporting}
            data-testid="editor-export-btn"
            title="Exportar estrutura do formulário em JSON"
          >
            {isExporting ? (
              <Loader2 size={15} className="spinner-icon" />
            ) : (
              <Download size={15} />
            )}
            <span>Exportar</span>
          </button>

          <button
            type="button"
            className={`editor-save-btn ${hasUnsavedChanges ? 'has-changes' : ''}`}
            onClick={handleManualSave}
            disabled={saving}
            data-testid="editor-save-btn"
            title={hasUnsavedChanges ? "Você possui alterações não salvas" : "Salvar formulário"}
          >
            {saving ? (
              <Loader2 size={15} className="spinner-icon" />
            ) : (
              <Save size={15} />
            )}
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
            {hasUnsavedChanges && <span className="unsaved-dot" title="Alterações pendentes de salvamento" />}
          </button>
        </div>
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
        <>
          {/* Sub-navegação Mobile do Editor para alternar entre os 3 painéis */}
          <div className="mobile-editor-subnav" data-testid="mobile-editor-subnav">
            <button
              type="button"
              className={`mobile-subnav-btn ${mobileEditorSection === 'questions' ? 'active' : ''}`}
              onClick={() => setMobileEditorSection('questions')}
              data-testid="mobile-subnav-questions"
            >
              <List size={15} />
              <span>Questões</span>
            </button>
            <button
              type="button"
              className={`mobile-subnav-btn ${mobileEditorSection === 'canvas' ? 'active' : ''}`}
              onClick={() => setMobileEditorSection('canvas')}
              data-testid="mobile-subnav-canvas"
            >
              <Eye size={15} />
              <span>Preview</span>
            </button>
            <button
              type="button"
              className={`mobile-subnav-btn ${mobileEditorSection === 'config' ? 'active' : ''}`}
              onClick={() => setMobileEditorSection('config')}
              data-testid="mobile-subnav-config"
            >
              <Settings size={15} />
              <span>Configuração</span>
            </button>
          </div>

          {/* Área de Trabalho do Editor (3 colunas no desktop, alternável no mobile) */}
          <div className={`editor-workspace mobile-view-${mobileEditorSection}`}>
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
              promptDeleteWelcomeScreen={promptDeleteWelcomeScreen}
              openTypePickerForAdd={openTypePickerForAdd}
              handleMoveQuestion={handleMoveQuestion}
              promptDeleteQuestion={promptDeleteQuestion}
              handleAddEndingScreen={handleAddEndingScreen}
              promptDeleteEndingScreen={promptDeleteEndingScreen}
              handleUpdateTheme={handleUpdateTheme}
              saving={saving}
              handleAddFlow={handleAddFlow}
              handleRenameFlow={handleRenameFlow}
              promptDeleteFlow={promptDeleteFlow}
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
        </>
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
