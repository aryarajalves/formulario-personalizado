/**
 * Utilitário de avaliação de lógica condicional, saltos e múltiplos fluxos/ramificações.
 */

export const CHOICE_QUESTION_TYPES = ['multiple_choice', 'dropdown', 'image_choice', 'yes_no'];
export const DEFAULT_FLOW_ID = 'default';

export function normalizeFormFlows(formOrFlows) {
  let list = [];
  if (Array.isArray(formOrFlows)) {
    list = formOrFlows;
  } else if (formOrFlows && Array.isArray(formOrFlows.flows)) {
    list = formOrFlows.flows;
  }
  if (!list || list.length === 0) {
    return [{ id: DEFAULT_FLOW_ID, name: 'Fluxo Principal' }];
  }
  if (!list.some(f => f.id === DEFAULT_FLOW_ID)) {
    return [{ id: DEFAULT_FLOW_ID, name: 'Fluxo Principal' }, ...list];
  }
  return list;
}

export function getQuestionDisplayTag(question, questions = [], flows = []) {
  if (!question) return '';
  if (question.tag !== undefined && question.tag !== null && String(question.tag).trim() !== '') {
    return question.tag;
  }

  const flowId = question.flow_id || DEFAULT_FLOW_ID;
  const normalizedFlows = flows.length > 0 ? flows : [{ id: DEFAULT_FLOW_ID, name: 'Fluxo Principal' }];
  const flowIdx = normalizedFlows.findIndex(f => f.id === flowId);

  // Questões do mesmo fluxo
  const questionsInFlow = (questions || []).filter(q => (q.flow_id || DEFAULT_FLOW_ID) === flowId);
  const indexInFlow = questionsInFlow.findIndex(q => q.id === question.id);
  const num = indexInFlow !== -1 ? indexInFlow + 1 : 1;

  if (flowId === DEFAULT_FLOW_ID || flowIdx <= 0) {
    return `${num} →`;
  }

  // Prefixo alfabético para ramificações: B, C, D...
  const letter = String.fromCharCode(65 + flowIdx);
  return `${letter}${num} →`;
}

export function getQuestionBadgeText(question, questions = [], flows = []) {
  if (!question) return '1';
  const flowId = question.flow_id || DEFAULT_FLOW_ID;
  const normalizedFlows = normalizeFormFlows(flows);
  const flowIdx = normalizedFlows.findIndex(f => f.id === flowId);

  const questionsInFlow = (questions || []).filter(q => (q.flow_id || DEFAULT_FLOW_ID) === flowId);
  const indexInFlow = questionsInFlow.findIndex(q => q.id === question.id);
  const num = indexInFlow !== -1 ? indexInFlow + 1 : 1;

  if (flowId === DEFAULT_FLOW_ID || flowIdx <= 0) {
    return `${num}`;
  }

  const letter = String.fromCharCode(65 + flowIdx);
  return `${letter}${num}`;
}

export function normalizeQuestionOptions(question) {
  if (!question) return [];
  const type = question.type;
  if (!CHOICE_QUESTION_TYPES.includes(type)) {
    return [];
  }

  const existing = question.options;
  if (Array.isArray(existing) && existing.length > 0) {
    return existing.map((opt, idx) => {
      if (typeof opt === 'string') {
        return {
          id: `opt_${idx + 1}`,
          label: opt,
          action: 'next',
          jump_to_question_id: null,
          jump_to_flow_id: null
        };
      }
      return {
        id: opt.id || `opt_${idx + 1}`,
        label: opt.label !== undefined ? opt.label : `Opção ${idx + 1}`,
        image_url: opt.image_url || '',
        action: opt.action || 'next',
        jump_to_question_id: opt.jump_to_question_id || null,
        jump_to_flow_id: opt.jump_to_flow_id || null
      };
    });
  }

  if (type === 'yes_no') {
    return [
      { id: 'opt_yes', label: 'Sim', action: 'next', jump_to_question_id: null, jump_to_flow_id: null },
      { id: 'opt_no', label: 'Não', action: 'next', jump_to_question_id: null, jump_to_flow_id: null }
    ];
  }

  if (type === 'image_choice') {
    return [
      { id: 'opt_1', label: 'Opção 1', image_url: '', action: 'next', jump_to_question_id: null, jump_to_flow_id: null },
      { id: 'opt_2', label: 'Opção 2', image_url: '', action: 'next', jump_to_question_id: null, jump_to_flow_id: null }
    ];
  }

  return [
    { id: 'opt_1', label: 'Opção 1', action: 'next', jump_to_question_id: null, jump_to_flow_id: null },
    { id: 'opt_2', label: 'Opção 2', action: 'next', jump_to_question_id: null, jump_to_flow_id: null }
  ];
}

export function evaluateNextQuestionIndex(currentStep, questions, answers) {
  if (!questions || !Array.isArray(questions)) {
    return currentStep + 1;
  }

  const currentQ = questions[currentStep];
  if (!currentQ) {
    return currentStep + 1;
  }

  // Nó de término / desqualificação sem input: finaliza o formulário
  if (currentQ.type === 'statement') {
    return questions.length;
  }

  const currentFlowId = currentQ.flow_id || DEFAULT_FLOW_ID;
  const answerVal = answers[currentQ.id];
  const stringAnswer = answerVal !== undefined && answerVal !== null ? String(answerVal).trim().toLowerCase() : '';

  // Avança dentro do mesmo fluxo; se for a última pergunta do fluxo, finaliza
  const getNextInCurrentFlow = () => {
    const nextIdx = questions.findIndex((q, idx) => idx > currentStep && (q.flow_id || DEFAULT_FLOW_ID) === currentFlowId);
    return nextIdx !== -1 ? nextIdx : questions.length;
  };

  // 1. Verifica se a questão é do tipo escolha e possui condicional em cada opção
  if (CHOICE_QUESTION_TYPES.includes(currentQ.type)) {
    const options = normalizeQuestionOptions(currentQ);
    const matchedOption = options.find(opt => {
      const optId = String(opt.id || '').trim().toLowerCase();
      const optLabel = String(opt.label || '').trim().toLowerCase();
      return optId === stringAnswer || optLabel === stringAnswer;
    });

    if (matchedOption) {
      if (matchedOption.action === 'end') {
        return questions.length; // Finaliza o formulário e exibe a Tela Final
      }
      if (matchedOption.action === 'jump_flow' && matchedOption.jump_to_flow_id) {
        const targetFlowId = matchedOption.jump_to_flow_id;
        // Pula para a primeira pergunta pertencente à ramificação/fluxo selecionado
        const targetIdx = questions.findIndex(q => (q.flow_id || DEFAULT_FLOW_ID) === targetFlowId);
        if (targetIdx !== -1) {
          return targetIdx;
        }
        // Se a ramificação não possui perguntas ainda, finaliza o formulário
        return questions.length;
      }
      if (matchedOption.action === 'jump' && matchedOption.jump_to_question_id) {
        if (matchedOption.jump_to_question_id === 'END_SCREEN') {
          return questions.length;
        }
        const targetIdx = questions.findIndex(q => q.id === matchedOption.jump_to_question_id);
        if (targetIdx !== -1) {
          return targetIdx;
        }
      }
      if (matchedOption.action === 'next') {
        return getNextInCurrentFlow();
      }
    }
  }

  // 2. Se não for condicional ou for questão de outro tipo, avança dentro do mesmo fluxo
  return getNextInCurrentFlow();
}
