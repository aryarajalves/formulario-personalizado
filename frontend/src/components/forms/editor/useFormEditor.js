import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { normalizeQuestionOptions, normalizeFormFlows, CHOICE_QUESTION_TYPES, DEFAULT_FLOW_ID } from '../../../utils/logicJump';
import { useFormResponses } from './useFormResponses';

export function useFormEditor(formId) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deviceView, setDeviceView] = useState('desktop');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [activeItemType, setActiveItemType] = useState('question'); // 'question' | 'ending_screen' | 'welcome_screen'
  const [selectedEndingIndex, setSelectedEndingIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('conteudo'); // conteudo, design, configuracoes

  const [editorTab, setEditorTab] = useState('editar'); // editar, integrar, compartilhar, resultados
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [typePickerMode, setTypePickerMode] = useState('add'); // 'add' | 'change'
  const [targetFlowIdForAdd, setTargetFlowIdForAdd] = useState(DEFAULT_FLOW_ID);
  const [editingQuestionTag, setEditingQuestionTag] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [googleCalConnected, setGoogleCalConnected] = useState(false);
  const [googleCalEmail, setGoogleCalEmail] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, index: null, title: '' });

  const { addToast } = useToast();
  const {
    responses, setResponses,
    responsesPage, setResponsesPage,
    responsesTotal, responsesTotalPages,
    responsesFilter, setResponsesFilter,
    responsesCounts, loadingResponses,
    fetchResponses
  } = useFormResponses(formId, editorTab, addToast);

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Não foi possível carregar o formulário.');
      const data = await res.json();

      if (!data.questions || data.questions.length === 0) {
        data.questions = [{
          id: 'q_default_1',
          type: 'short_text',
          category: 'TEXTO E NÚMERO',
          title: 'Qual é o seu nome completo?',
          required: true,
          flow_id: DEFAULT_FLOW_ID,
          placeholder: 'Digite sua resposta aqui...'
        }];
      }
      data.flows = normalizeFormFlows(data.flows);
      setForm(data);
      setTitleInput(data.title);
      setWebhookUrl(data.webhook_url || '');
      setGoogleCalConnected(!!data.google_calendar_connected);
      setGoogleCalEmail(data.google_calendar_email || '');
      setHasUnsavedChanges(false);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar formulário', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async (
    updatedQuestions,
    updatedTitle,
    updatedWebhookUrl,
    updatedGoogleCal,
    updatedEndingScreens,
    updatedWelcomeScreen,
    updatedTheme,
    updatedFlows
  ) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      const payload = {
        title: updatedTitle !== undefined ? updatedTitle : (form?.title || titleInput),
        questions: updatedQuestions !== undefined ? updatedQuestions : (form?.questions || []),
        flows: updatedFlows !== undefined ? updatedFlows : (form?.flows || []),
        welcome_screen: updatedWelcomeScreen !== undefined ? updatedWelcomeScreen : (form?.welcome_screen || null),
        ending_screens: updatedEndingScreens !== undefined ? updatedEndingScreens : (form?.ending_screens || []),
        theme: updatedTheme !== undefined ? updatedTheme : (form?.theme || {}),
        webhook_url: updatedWebhookUrl !== undefined ? updatedWebhookUrl : (form?.webhook_url || null)
      };

      if (updatedGoogleCal) {
        payload.google_calendar_connected = updatedGoogleCal.connected;
        payload.google_calendar_email = updatedGoogleCal.email;
      }

      const res = await fetch(`/api/v1/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Erro ao salvar alterações.');
      const saved = await res.json();
      saved.flows = normalizeFormFlows(saved.flows);
      setForm(saved);
      setTitleInput(saved.title);
      setWebhookUrl(saved.webhook_url || '');
      setGoogleCalConnected(!!saved.google_calendar_connected);
      setGoogleCalEmail(saved.google_calendar_email || '');
      setHasUnsavedChanges(false);
      addToast('Alterações salvas com sucesso!', 'success');
      return saved;
    } catch (err) {
      addToast(err.message || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = () => {
    return handleSaveForm();
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Não foi possível gerar link de autorização do Google.');
      }
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      addToast(err.message || 'Erro ao iniciar conexão com Google', 'error');
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/integrations/google-calendar/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro ao desconectar conta do Google.');
      setGoogleCalConnected(false);
      setGoogleCalEmail('');
      addToast('Conta do Google Agenda desconectada com sucesso!', 'success');
      fetchForm();
    } catch (err) {
      addToast(err.message || 'Erro ao desconectar', 'error');
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      addToast('Informe uma URL de webhook válida antes de testar.', 'warning');
      return;
    }

    try {
      setTestingWebhook(true);
      if (webhookUrl !== form?.webhook_url) {
        await handleSaveForm(null, null, webhookUrl.trim());
      }

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/forms/${formId}/test-webhook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao conectar com a URL informada.');
      }

      addToast(data.message || 'Webhook disparado e recebido com sucesso!', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao disparar webhook.', 'error');
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleAddQuestion = (typeItem, targetFlowId = null) => {
    const isChoice = CHOICE_QUESTION_TYPES.includes(typeItem.id);
    const flowId = targetFlowId || targetFlowIdForAdd || DEFAULT_FLOW_ID;
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: typeItem.id,
      category: typeItem.category,
      title: typeItem.defaultTitle,
      required: false,
      flow_id: flowId,
      placeholder: 'Digite sua resposta aqui...',
      options: isChoice ? normalizeQuestionOptions({ type: typeItem.id }) : undefined
    };
    const newQuestions = [...(form?.questions || []), newQuestion];
    setForm(prev => ({ ...prev, questions: newQuestions }));
    setSelectedQuestionIndex(newQuestions.length - 1);
    setActiveItemType('question');
    setHasUnsavedChanges(true);
  };

  const handleChangeQuestionType = (typeItem) => {
    const updated = [...(form?.questions || [])];
    const targetIdx = selectedQuestionIndex >= 0 && selectedQuestionIndex < updated.length ? selectedQuestionIndex : 0;
    if (updated[targetIdx]) {
      const isChoice = CHOICE_QUESTION_TYPES.includes(typeItem.id);
      updated[targetIdx] = {
        ...updated[targetIdx],
        type: typeItem.id,
        category: typeItem.category,
        options: isChoice ? normalizeQuestionOptions({ type: typeItem.id, options: updated[targetIdx].options }) : updated[targetIdx].options
      };
      setForm(prev => ({ ...prev, questions: updated }));
      setHasUnsavedChanges(true);
    }
  };

  const openTypePickerForAdd = (targetFlowId = DEFAULT_FLOW_ID) => {
    setTargetFlowIdForAdd(typeof targetFlowId === 'string' ? targetFlowId : DEFAULT_FLOW_ID);
    setTypePickerMode('add');
    setIsTypePickerOpen(true);
  };

  const openTypePickerForChange = () => {
    setTypePickerMode('change');
    setIsTypePickerOpen(true);
  };

  const handleAddFlow = (customName) => {
    const currentFlows = normalizeFormFlows(form?.flows);
    const nextLetter = String.fromCharCode(65 + currentFlows.length);
    const newFlow = {
      id: `flow_${Date.now()}`,
      name: (customName || `Ramificação ${nextLetter}`).trim()
    };
    const updatedFlows = [...currentFlows, newFlow];
    setForm(prev => ({ ...prev, flows: updatedFlows }));
    setHasUnsavedChanges(true);
    return newFlow.id;
  };

  const handleRenameFlow = (flowId, newName) => {
    if (!newName || !newName.trim()) return;
    const currentFlows = normalizeFormFlows(form?.flows);
    const updatedFlows = currentFlows.map(f => f.id === flowId ? { ...f, name: newName.trim() } : f);
    setForm(prev => ({ ...prev, flows: updatedFlows }));
    setHasUnsavedChanges(true);
  };

  const promptDeleteFlow = (flowId) => {
    if (flowId === DEFAULT_FLOW_ID) {
      addToast('O Fluxo Principal não pode ser excluído.', 'warning');
      return;
    }
    const currentFlows = normalizeFormFlows(form?.flows);
    const flow = currentFlows.find(f => f.id === flowId);
    setDeleteConfirm({
      isOpen: true,
      type: 'flow',
      index: flowId,
      title: flow?.name ? `a "${flow.name}" e todas as suas questões` : 'a ramificação'
    });
  };

  const handleMoveQuestionToFlow = (qIndex, targetFlowId) => {
    const updated = [...(form?.questions || [])];
    if (updated[qIndex]) {
      updated[qIndex] = {
        ...updated[qIndex],
        flow_id: targetFlowId || DEFAULT_FLOW_ID
      };
      setForm(prev => ({ ...prev, questions: updated }));
      setHasUnsavedChanges(true);
    }
  };

  const promptDeleteWelcomeScreen = () => {
    setDeleteConfirm({
      isOpen: true,
      type: 'welcome_screen',
      index: 0,
      title: 'a Tela de Boas-Vindas'
    });
  };

  const promptDeleteQuestion = (idx) => {
    const q = form?.questions?.[idx];
    const qTitle = q?.title ? `"${q.title}"` : `a Questão ${idx + 1}`;
    setDeleteConfirm({
      isOpen: true,
      type: 'question',
      index: idx,
      title: qTitle
    });
  };

  const promptDeleteEndingScreen = (idx) => {
    const screen = form?.ending_screens?.[idx];
    const screenTitle = screen?.title ? `"${screen.title}"` : `a Tela Final ${idx + 1}`;
    setDeleteConfirm({
      isOpen: true,
      type: 'ending_screen',
      index: idx,
      title: screenTitle
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm.isOpen || deleteConfirm.index === null) return;

    if (deleteConfirm.type === 'welcome_screen') {
      handleToggleWelcomeScreen(false);
    } else if (deleteConfirm.type === 'question') {
      const idxToDelete = deleteConfirm.index;
      const currentQuestions = form?.questions || [];
      if (currentQuestions.length <= 1) {
        addToast('O formulário deve ter no mínimo uma questão.', 'warning');
        setDeleteConfirm({ isOpen: false, type: null, index: null, title: '' });
        return;
      }
      const newQuestions = currentQuestions.filter((_, idx) => idx !== idxToDelete);
      setForm(prev => ({ ...prev, questions: newQuestions }));
      if (selectedQuestionIndex >= newQuestions.length) {
        setSelectedQuestionIndex(Math.max(0, newQuestions.length - 1));
      }
      setHasUnsavedChanges(true);
    } else if (deleteConfirm.type === 'ending_screen') {
      const idxToDelete = deleteConfirm.index;
      const currentEndings = form?.ending_screens || [];
      const newEndings = currentEndings.filter((_, idx) => idx !== idxToDelete);
      setForm(prev => ({ ...prev, ending_screens: newEndings }));
      if (newEndings.length === 0) {
        setActiveItemType('question');
      } else {
        setSelectedEndingIndex(Math.max(0, idxToDelete - 1));
      }
      setHasUnsavedChanges(true);
    } else if (deleteConfirm.type === 'flow') {
      const flowIdToDelete = deleteConfirm.index;
      const currentFlows = normalizeFormFlows(form?.flows);
      const updatedFlows = currentFlows.filter(f => f.id !== flowIdToDelete);
      const updatedQuestions = (form?.questions || []).filter(q => (q.flow_id || DEFAULT_FLOW_ID) !== flowIdToDelete);
      setForm(prev => ({ ...prev, flows: updatedFlows, questions: updatedQuestions }));
      setSelectedQuestionIndex(0);
      setHasUnsavedChanges(true);
    }

    setDeleteConfirm({ isOpen: false, type: null, index: null, title: '' });
  };

  const handleAddEndingScreen = () => {
    const currentEndings = form?.ending_screens || [];
    if (currentEndings.length >= 1) {
      addToast('Só é permitida uma tela final por formulário.', 'warning');
      return;
    }
    const newEnding = {
      id: `end_${Date.now()}`,
      title: 'Recebemos sua aplicação',
      description: 'Obrigado por responder nosso formulário. Suas respostas foram salvas com sucesso.',
      button_text: 'Acessar nosso site',
      button_url: 'https://'
    };
    const newEndings = [...currentEndings, newEnding];
    setForm(prev => ({ ...prev, ending_screens: newEndings }));
    setActiveItemType('ending_screen');
    setSelectedEndingIndex(newEndings.length - 1);
    setHasUnsavedChanges(true);
  };

  const handleMoveQuestion = (fromIdx, toIdx) => {
    const list = [...(form?.questions || [])];
    if (fromIdx < 0 || fromIdx >= list.length || toIdx < 0 || toIdx >= list.length || fromIdx === toIdx) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setForm(prev => ({ ...prev, questions: list }));
    setSelectedQuestionIndex(toIdx);
    setActiveItemType('question');
    setHasUnsavedChanges(true);
  };

  const handleUpdateCurrentEndingScreen = (field, value) => {
    const updated = [...(form?.ending_screens || [])];
    const targetIdx = selectedEndingIndex >= 0 && selectedEndingIndex < updated.length ? selectedEndingIndex : 0;
    if (updated[targetIdx]) {
      updated[targetIdx] = { ...updated[targetIdx], [field]: value };
      setForm(prev => ({ ...prev, ending_screens: updated }));
      setHasUnsavedChanges(true);
    }
  };

  const handleToggleWelcomeScreen = (enabled) => {
    if (enabled) {
      const defaultWelcome = {
        enabled: true,
        title: form?.title || 'Boas-vindas ao Formulário',
        description: 'Preencha este formulário para nos ajudar a entender melhor seu caso.',
        button_text: 'COMEÇAR FORMULÁRIO'
      };
      setForm(prev => ({ ...prev, welcome_screen: defaultWelcome }));
      setActiveItemType('welcome_screen');
      setHasUnsavedChanges(true);
    } else {
      const disabledWelcome = { enabled: false };
      setForm(prev => ({ ...prev, welcome_screen: disabledWelcome }));
      if (activeItemType === 'welcome_screen') setActiveItemType('question');
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateWelcomeScreen = (field, value) => {
    const current = form?.welcome_screen || {};
    const updated = { ...current, enabled: true, [field]: value };
    setForm(prev => ({ ...prev, welcome_screen: updated }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateCurrentQuestion = (field, value) => {
    const updated = [...(form?.questions || [])];
    const targetIdx = selectedQuestionIndex >= 0 && selectedQuestionIndex < updated.length ? selectedQuestionIndex : 0;
    if (updated[targetIdx]) {
      updated[targetIdx] = { ...updated[targetIdx], [field]: value };
      setForm(prev => ({ ...prev, questions: updated }));
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== form?.title) {
      setForm(prev => ({ ...prev, title: titleInput.trim() }));
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateTheme = (newThemeAttrs) => {
    const updatedTheme = { ...(form?.theme || {}), ...newThemeAttrs };
    setForm(prev => ({ ...prev, theme: updatedTheme }));
    setHasUnsavedChanges(true);
  };

  const copyShareLink = () => {
    if (!form?.slug) return;
    const url = `${window.location.origin}/form/${form.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    addToast('Link copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return {
    form, setForm, loading, saving, hasUnsavedChanges, setHasUnsavedChanges,
    deviceView, setDeviceView,
    selectedQuestionIndex, setSelectedQuestionIndex, activeItemType, setActiveItemType,
    selectedEndingIndex, setSelectedEndingIndex, activeTab, setActiveTab,
    editorTab, setEditorTab, webhookUrl, setWebhookUrl, testingWebhook,
    isTypePickerOpen, setIsTypePickerOpen, typePickerMode, setTypePickerMode,
    targetFlowIdForAdd, setTargetFlowIdForAdd,
    editingQuestionTag, setEditingQuestionTag, isEditingTitle, setIsEditingTitle,
    titleInput, setTitleInput, copiedLink, responses, responsesTotal,
    responsesTotalPages, responsesFilter, setResponsesFilter, responsesCounts,
    responsesPage, setResponsesPage, loadingResponses, googleCalConnected,
    googleCalEmail, deleteConfirm, setDeleteConfirm, handleSaveForm, handleManualSave,
    handleConnectGoogleCalendar, handleDisconnectGoogleCalendar, handleTestWebhook,
    handleAddQuestion, handleChangeQuestionType, openTypePickerForAdd,
    openTypePickerForChange, handleAddFlow, handleRenameFlow, promptDeleteFlow,
    handleMoveQuestionToFlow,
    promptDeleteQuestion, promptDeleteEndingScreen,
    promptDeleteWelcomeScreen, handleConfirmDelete, handleAddEndingScreen,
    handleMoveQuestion, handleUpdateCurrentEndingScreen, handleToggleWelcomeScreen,
    handleUpdateWelcomeScreen, handleUpdateCurrentQuestion, handleSaveTitle,
    handleUpdateTheme, copyShareLink
  };
}
