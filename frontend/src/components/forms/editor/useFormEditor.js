import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';

export function useFormEditor(formId) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [editingQuestionTag, setEditingQuestionTag] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [responses, setResponses] = useState([]);
  const [responsesPage, setResponsesPage] = useState(1);
  const [responsesTotal, setResponsesTotal] = useState(0);
  const [responsesTotalPages, setResponsesTotalPages] = useState(1);
  const [responsesFilter, setResponsesFilter] = useState('ALL'); // 'ALL' | 'CONCLUIDO' | 'PARCIAL'
  const [responsesCounts, setResponsesCounts] = useState({ all: 0, completed: 0, partial: 0 });
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [googleCalConnected, setGoogleCalConnected] = useState(false);
  const [googleCalEmail, setGoogleCalEmail] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: null,
    index: null,
    title: ''
  });

  const { addToast } = useToast();

  useEffect(() => {
    fetchForm();
  }, [formId]);

  useEffect(() => {
    if (editorTab === 'resultados') {
      fetchResponses(responsesPage, responsesFilter);
    }
  }, [editorTab, responsesPage, responsesFilter]);

  const fetchResponses = async (page = 1, status = 'ALL') => {
    try {
      setLoadingResponses(true);
      const token = localStorage.getItem('auth_token');
      const statusParam = status !== 'ALL' ? `&status=${status}` : '';
      const res = await fetch(`/api/v1/forms/${formId}/responses?page=${page}&limit=20${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Não foi possível carregar as respostas.');
      const data = await res.json();
      setResponses(data.items || []);
      setResponsesTotal(data.total || 0);
      setResponsesTotalPages(data.total_pages || 1);
      if (data.counts) {
        setResponsesCounts(data.counts);
      }
    } catch (err) {
      addToast(err.message || 'Erro ao carregar respostas', 'error');
    } finally {
      setLoadingResponses(false);
    }
  };

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
        data.questions = [
          {
            id: 'q_default_1',
            type: 'short_text',
            category: 'TEXTO E NÚMERO',
            title: 'Qual é o seu nome completo?',
            required: true,
            placeholder: 'Digite sua resposta aqui...'
          }
        ];
      }
      setForm(data);
      setTitleInput(data.title);
      setWebhookUrl(data.webhook_url || '');
      setGoogleCalConnected(!!data.google_calendar_connected);
      setGoogleCalEmail(data.google_calendar_email || '');
    } catch (err) {
      addToast(err.message || 'Erro ao carregar formulário', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async (updatedQuestions, updatedTitle, updatedWebhookUrl, updatedGoogleCal, updatedEndingScreens, updatedWelcomeScreen) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      const payload = {
        title: updatedTitle || form?.title,
        questions: updatedQuestions || form?.questions,
        welcome_screen: updatedWelcomeScreen !== undefined ? updatedWelcomeScreen : (form?.welcome_screen || null),
        ending_screens: updatedEndingScreens !== undefined ? updatedEndingScreens : (form?.ending_screens || []),
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
      setForm(saved);
      setWebhookUrl(saved.webhook_url || '');
      setGoogleCalConnected(!!saved.google_calendar_connected);
      setGoogleCalEmail(saved.google_calendar_email || '');
      addToast('Alterações salvas com sucesso!', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
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

  const handleAddQuestion = (typeItem) => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: typeItem.id,
      category: typeItem.category,
      title: typeItem.defaultTitle,
      required: false,
      placeholder: 'Digite sua resposta aqui...'
    };

    const newQuestions = [...(form?.questions || []), newQuestion];
    setForm(prev => ({ ...prev, questions: newQuestions }));
    setSelectedQuestionIndex(newQuestions.length - 1);
    handleSaveForm(newQuestions);
  };

  const handleChangeQuestionType = (typeItem) => {
    const updated = [...(form?.questions || [])];
    const targetIdx = selectedQuestionIndex >= 0 && selectedQuestionIndex < updated.length ? selectedQuestionIndex : 0;
    if (updated[targetIdx]) {
      updated[targetIdx] = {
        ...updated[targetIdx],
        type: typeItem.id,
        category: typeItem.category
      };
      setForm(prev => ({ ...prev, questions: updated }));
      handleSaveForm(updated);
      addToast(`Tipo alterado para ${typeItem.label}!`, 'success');
    }
  };

  const openTypePickerForAdd = () => {
    setTypePickerMode('add');
    setIsTypePickerOpen(true);
  };

  const openTypePickerForChange = () => {
    setTypePickerMode('change');
    setIsTypePickerOpen(true);
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

    if (deleteConfirm.type === 'question') {
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
      handleSaveForm(newQuestions);
      addToast('Questão excluída com sucesso!', 'info');
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
      handleSaveForm(null, null, undefined, undefined, newEndings);
      addToast('Tela final removida com sucesso!', 'info');
    }

    setDeleteConfirm({ isOpen: false, type: null, index: null, title: '' });
  };

  const handleAddEndingScreen = () => {
    const newEnding = {
      id: `end_${Date.now()}`,
      title: 'Recebemos sua aplicação',
      description: 'Obrigado por responder nosso formulário. Suas respostas foram salvas com sucesso.',
      button_text: 'Acessar nosso site',
      button_url: 'https://'
    };
    const currentEndings = form?.ending_screens || [];
    const newEndings = [...currentEndings, newEnding];
    setForm(prev => ({ ...prev, ending_screens: newEndings }));
    setActiveItemType('ending_screen');
    setSelectedEndingIndex(newEndings.length - 1);
    handleSaveForm(null, null, undefined, undefined, newEndings);
    addToast('Tela final adicionada com sucesso!', 'success');
  };

  const handleUpdateCurrentEndingScreen = (field, value, autoSave = false) => {
    const updated = [...(form?.ending_screens || [])];
    const targetIdx = selectedEndingIndex >= 0 && selectedEndingIndex < updated.length ? selectedEndingIndex : 0;
    if (updated[targetIdx]) {
      updated[targetIdx] = {
        ...updated[targetIdx],
        [field]: value
      };
      setForm(prev => ({ ...prev, ending_screens: updated }));
      if (autoSave) {
        handleSaveForm(null, null, undefined, undefined, updated);
      }
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
      handleSaveForm(null, null, undefined, undefined, undefined, defaultWelcome);
      addToast('Tela de boas-vindas ativada com sucesso!', 'success');
    } else {
      const disabledWelcome = {
        enabled: false
      };
      setForm(prev => ({ ...prev, welcome_screen: disabledWelcome }));
      if (activeItemType === 'welcome_screen') {
        setActiveItemType('question');
      }
      handleSaveForm(null, null, undefined, undefined, undefined, disabledWelcome);
      addToast('Tela de boas-vindas desativada.', 'info');
    }
  };

  const handleUpdateWelcomeScreen = (field, value, autoSave = false) => {
    const current = form?.welcome_screen || {};
    const updated = {
      ...current,
      enabled: true,
      [field]: value
    };
    setForm(prev => ({ ...prev, welcome_screen: updated }));
    if (autoSave) {
      handleSaveForm(null, null, undefined, undefined, undefined, updated);
    }
  };

  const handleUpdateCurrentQuestion = (field, value, autoSave = false) => {
    const updated = [...(form?.questions || [])];
    const targetIdx = selectedQuestionIndex >= 0 && selectedQuestionIndex < updated.length ? selectedQuestionIndex : 0;
    if (updated[targetIdx]) {
      updated[targetIdx] = {
        ...updated[targetIdx],
        [field]: value
      };
      setForm(prev => ({ ...prev, questions: updated }));
      if (autoSave) {
        handleSaveForm(updated);
      }
    }
  };

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== form?.title) {
      handleSaveForm(null, titleInput.trim());
    }
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
    copyShareLink
  };
}
