/**
 * Utilitário de avaliação de lógica condicional e saltos lógicos entre perguntas.
 */

export function evaluateNextQuestionIndex(currentStep, questions, answers) {
  if (!questions || !Array.isArray(questions)) {
    return currentStep + 1;
  }

  const currentQ = questions[currentStep];
  if (!currentQ) {
    return currentStep + 1;
  }

  const answerVal = answers[currentQ.id];
  const stringAnswer = answerVal !== undefined && answerVal !== null ? String(answerVal).trim().toLowerCase() : '';

  // Verifica se há regras de salto condicional na questão
  const logicRules = currentQ.logic_jump?.rules || [];
  for (const rule of logicRules) {
    const targetVal = String(rule.value || '').trim().toLowerCase();
    let matches = false;

    if (rule.condition === 'equals') {
      matches = stringAnswer === targetVal;
    } else if (rule.condition === 'not_equals') {
      matches = stringAnswer !== targetVal && stringAnswer !== '';
    } else if (rule.condition === 'contains') {
      matches = stringAnswer.includes(targetVal);
    } else if (rule.condition === 'is_not_empty') {
      matches = stringAnswer !== '';
    }

    if (matches && rule.jump_to_question_id) {
      const targetIdx = questions.findIndex(q => q.id === rule.jump_to_question_id);
      if (targetIdx !== -1) {
        return targetIdx;
      }
    }
  }

  // Se houver salto padrão configurado
  if (currentQ.logic_jump?.default_jump_to_question_id) {
    const targetIdx = questions.findIndex(q => q.id === currentQ.logic_jump.default_jump_to_question_id);
    if (targetIdx !== -1) {
      return targetIdx;
    }
  }

  return currentStep + 1;
}
