import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LogicJumpConfig from './LogicJumpConfig';

describe('LogicJumpConfig Component', () => {
  const mockCurrentQuestion = {
    id: 'q1',
    title: 'Qual é o seu objetivo?',
    logic_jump: {
      rules: [
        { id: 'rule_1', condition: 'equals', value: 'Vendas', jump_to_question_id: 'q3' }
      ],
      default_jump_to_question_id: null
    }
  };

  const mockAllQuestions = [
    { id: 'q1', title: 'Qual é o seu objetivo?' },
    { id: 'q2', title: 'Pergunta intermediária' },
    { id: 'q3', title: 'Qual seu faturamento atual?' }
  ];

  it('renders existing logic rule with condition and target', () => {
    render(
      <LogicJumpConfig
        currentQuestion={mockCurrentQuestion}
        allQuestions={mockAllQuestions}
        onUpdateLogicJump={vi.fn()}
      />
    );

    expect(screen.getByText('LÓGICA CONDICIONAL / PULO')).toBeDefined();
    expect(screen.getByTestId('logic-rule-0')).toBeDefined();
    expect(screen.getByDisplayValue('Vendas')).toBeDefined();
    expect(screen.getByDisplayValue('2. Qual seu faturamento atual?')).toBeDefined();
  });

  it('calls onUpdateLogicJump when adding a new rule', () => {
    const handleUpdate = vi.fn();
    render(
      <LogicJumpConfig
        currentQuestion={mockCurrentQuestion}
        allQuestions={mockAllQuestions}
        onUpdateLogicJump={handleUpdate}
      />
    );

    const addBtn = screen.getByTestId('add-logic-rule-btn');
    fireEvent.click(addBtn);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const updatedPayload = handleUpdate.mock.calls[0][0];
    expect(updatedPayload.rules.length).toBe(2);
  });

  it('calls onUpdateLogicJump when changing default jump', () => {
    const handleUpdate = vi.fn();
    render(
      <LogicJumpConfig
        currentQuestion={mockCurrentQuestion}
        allQuestions={mockAllQuestions}
        onUpdateLogicJump={handleUpdate}
      />
    );

    const defaultSelect = screen.getByTestId('logic-default-jump-select');
    fireEvent.change(defaultSelect, { target: { value: 'q2' } });

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ default_jump_to_question_id: 'q2' })
    );
  });
});
