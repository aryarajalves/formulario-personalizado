import { describe, it, expect } from 'vitest';
import {
  evaluateNextQuestionIndex,
  normalizeQuestionOptions,
  normalizeFormFlows,
  getQuestionDisplayTag,
  getQuestionBadgeText
} from './logicJump';

describe('normalizeFormFlows & getQuestionDisplayTag utilities', () => {
  it('returns default flow when flows array is empty or undefined', () => {
    expect(normalizeFormFlows(null)).toEqual([{ id: 'default', name: 'Fluxo Principal' }]);
    expect(normalizeFormFlows({})).toEqual([{ id: 'default', name: 'Fluxo Principal' }]);
    expect(normalizeFormFlows({ flows: [] })).toEqual([{ id: 'default', name: 'Fluxo Principal' }]);
  });

  it('formats display tags correctly for main flow and branch flows', () => {
    const flows = [
      { id: 'default', name: 'Fluxo Principal' },
      { id: 'flow_b', name: 'Ramificação B' }
    ];
    const questions = [
      { id: 'q1', flow_id: 'default' },
      { id: 'q2', flow_id: 'default' },
      { id: 'q_b1', flow_id: 'flow_b' },
      { id: 'q_b2', flow_id: 'flow_b' }
    ];

    expect(getQuestionDisplayTag(questions[0], questions, flows)).toBe('1 →');
    expect(getQuestionDisplayTag(questions[1], questions, flows)).toBe('2 →');
    expect(getQuestionDisplayTag(questions[2], questions, flows)).toBe('B1 →');
    expect(getQuestionDisplayTag(questions[3], questions, flows)).toBe('B2 →');

    expect(getQuestionBadgeText(questions[0], questions, flows)).toBe('1');
    expect(getQuestionBadgeText(questions[1], questions, flows)).toBe('2');
    expect(getQuestionBadgeText(questions[2], questions, flows)).toBe('B1');
    expect(getQuestionBadgeText(questions[3], questions, flows)).toBe('B2');
  });
});

describe('normalizeQuestionOptions utility', () => {
  it('returns default options for yes_no questions', () => {
    const opts = normalizeQuestionOptions({ type: 'yes_no' });
    expect(opts).toHaveLength(2);
    expect(opts[0].label).toBe('Sim');
    expect(opts[1].label).toBe('Não');
  });

  it('normalizes string options into objects', () => {
    const opts = normalizeQuestionOptions({
      type: 'multiple_choice',
      options: ['Plano Pro', 'Plano Lite']
    });
    expect(opts).toHaveLength(2);
    expect(opts[0]).toMatchObject({ id: 'opt_1', label: 'Plano Pro', action: 'next' });
    expect(opts[1]).toMatchObject({ id: 'opt_2', label: 'Plano Lite', action: 'next' });
  });

  it('returns empty array for non-choice question types', () => {
    expect(normalizeQuestionOptions({ type: 'short_text' })).toEqual([]);
    expect(normalizeQuestionOptions({ type: 'email' })).toEqual([]);
  });
});

describe('evaluateNextQuestionIndex utility', () => {
  it('advances only within the same flow and finishes at the end of the flow', () => {
    const questions = [
      { id: 'q1', flow_id: 'default', type: 'short_text' },
      { id: 'q2', flow_id: 'default', type: 'short_text' },
      { id: 'q_b1', flow_id: 'flow_b', type: 'short_text' },
      { id: 'q_b2', flow_id: 'flow_b', type: 'short_text' }
    ];

    // From q1 (index 0) in default flow -> advances to q2 (index 1)
    expect(evaluateNextQuestionIndex(0, questions, { q1: 'test' })).toBe(1);

    // From q2 (index 1) in default flow -> reaching the end of default flow -> finishes (index 4 = questions.length)
    expect(evaluateNextQuestionIndex(1, questions, { q2: 'test' })).toBe(4);

    // From q_b1 (index 2) in branch flow -> advances to q_b2 (index 3)
    expect(evaluateNextQuestionIndex(2, questions, { q_b1: 'test' })).toBe(3);

    // From q_b2 (index 3) in branch flow -> end of branch flow -> finishes (index 4)
    expect(evaluateNextQuestionIndex(3, questions, { q_b2: 'test' })).toBe(4);
  });

  it('jumps across flows via choice option conditional', () => {
    const questions = [
      {
        id: 'q1',
        flow_id: 'default',
        type: 'multiple_choice',
        options: [
          { id: 'opt_1', label: 'Seguir normal', action: 'next' },
          { id: 'opt_2', label: 'Ir para ramificação', action: 'jump', jump_to_question_id: 'q_b1' },
          { id: 'opt_3', label: 'Sair agora', action: 'end' }
        ]
      },
      { id: 'q2', flow_id: 'default', type: 'short_text' },
      { id: 'q_b1', flow_id: 'flow_b', type: 'short_text' }
    ];

    // Option 'Seguir normal' stays in flow -> index 1
    expect(evaluateNextQuestionIndex(0, questions, { q1: 'Seguir normal' })).toBe(1);

    // Option 'Ir para ramificação' jumps across flows to q_b1 -> index 2
    expect(evaluateNextQuestionIndex(0, questions, { q1: 'Ir para ramificação' })).toBe(2);

    // Option 'Sair agora' ends -> index 3 (questions.length)
    expect(evaluateNextQuestionIndex(0, questions, { q1: 'Sair agora' })).toBe(3);
  });

  it('jumps to another branch via jump_flow action directly to its first question', () => {
    const questions = [
      {
        id: 'q1',
        flow_id: 'default',
        type: 'multiple_choice',
        options: [
          { id: 'opt_1', label: 'Opção Padrão', action: 'next' },
          { id: 'opt_2', label: 'Pular para Ramificação C', action: 'jump_flow', jump_to_flow_id: 'flow_c' },
          { id: 'opt_3', label: 'Pular para Ramificação Vazia', action: 'jump_flow', jump_to_flow_id: 'flow_empty' }
        ]
      },
      { id: 'q2', flow_id: 'default', type: 'short_text' },
      { id: 'q_b1', flow_id: 'flow_b', type: 'short_text' },
      { id: 'q_c1', flow_id: 'flow_c', type: 'short_text' },
      { id: 'q_c2', flow_id: 'flow_c', type: 'short_text' }
    ];

    // Jumps directly to first question of flow_c (q_c1, index 3)
    expect(evaluateNextQuestionIndex(0, questions, { q1: 'Pular para Ramificação C' })).toBe(3);

    // If target flow has no questions, finishes form (index 5 = questions.length)
    expect(evaluateNextQuestionIndex(0, questions, { q1: 'Pular para Ramificação Vazia' })).toBe(5);
  });
});
