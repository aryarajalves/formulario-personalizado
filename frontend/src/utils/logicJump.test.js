import { describe, it, expect } from 'vitest';
import { evaluateNextQuestionIndex } from './logicJump';

describe('evaluateNextQuestionIndex utility', () => {
  const mockQuestions = [
    {
      id: 'q1',
      title: 'Você tem interesse em nossos serviços?',
      logic_jump: {
        rules: [
          { id: 'r1', condition: 'equals', value: 'Sim', jump_to_question_id: 'q3' },
          { id: 'r2', condition: 'equals', value: 'Não', jump_to_question_id: 'q4' }
        ],
        default_jump_to_question_id: null
      }
    },
    { id: 'q2', title: 'Pergunta intermediária' },
    { id: 'q3', title: 'Excelente! Qual é o seu orçamento?' },
    { id: 'q4', title: 'Qual o motivo da recusa?' }
  ];

  it('jumps directly to q3 (index 2) when answer equals "Sim"', () => {
    const answers = { q1: 'Sim' };
    const nextIdx = evaluateNextQuestionIndex(0, mockQuestions, answers);
    expect(nextIdx).toBe(2);
  });

  it('jumps directly to q4 (index 3) when answer equals "Não"', () => {
    const answers = { q1: 'Não' };
    const nextIdx = evaluateNextQuestionIndex(0, mockQuestions, answers);
    expect(nextIdx).toBe(3);
  });

  it('follows natural sequential flow (index 1) when no condition matches and no default jump is set', () => {
    const answers = { q1: 'Talvez' };
    const nextIdx = evaluateNextQuestionIndex(0, mockQuestions, answers);
    expect(nextIdx).toBe(1);
  });

  it('respects default jump if provided and no rules match', () => {
    const questionsWithDefault = [
      {
        id: 'q1',
        logic_jump: {
          rules: [],
          default_jump_to_question_id: 'q4'
        }
      },
      ...mockQuestions.slice(1)
    ];
    const nextIdx = evaluateNextQuestionIndex(0, questionsWithDefault, { q1: 'Qualquer' });
    expect(nextIdx).toBe(3);
  });

  it('evaluates "contains" and "not_equals" conditions correctly', () => {
    const questions = [
      {
        id: 'q1',
        logic_jump: {
          rules: [
            { id: 'r1', condition: 'contains', value: 'vip', jump_to_question_id: 'q3' }
          ]
        }
      },
      { id: 'q2' },
      { id: 'q3' }
    ];

    expect(evaluateNextQuestionIndex(0, questions, { q1: 'Quero o plano VIP' })).toBe(2);
    expect(evaluateNextQuestionIndex(0, questions, { q1: 'Quero o básico' })).toBe(1);
  });
});
