import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionOptionsConfig from './QuestionOptionsConfig';

describe('QuestionOptionsConfig Component', () => {
  const allQuestions = [
    { id: 'q1', title: 'Primeira Pergunta', type: 'multiple_choice' },
    { id: 'q2', title: 'Segunda Pergunta', type: 'short_text' },
    { id: 'q3', title: 'Terceira Pergunta', type: 'short_text' }
  ];

  it('renders options for multiple_choice and allows editing option label', () => {
    const onUpdateOptions = vi.fn();
    const currentQuestion = {
      id: 'q1',
      type: 'multiple_choice',
      options: [
        { id: 'opt_1', label: 'Opção Alpha', action: 'next' },
        { id: 'opt_2', label: 'Opção Beta', action: 'next' }
      ]
    };

    render(
      <QuestionOptionsConfig
        currentQuestion={currentQuestion}
        allQuestions={allQuestions}
        onUpdateOptions={onUpdateOptions}
      />
    );

    expect(screen.getByText('Opções & Condicionais de Escolha')).toBeInTheDocument();
    const labelInput = screen.getByTestId('option-label-input-0');
    expect(labelInput.value).toBe('Opção Alpha');

    fireEvent.change(labelInput, { target: { value: 'Opção Premium' } });
    expect(onUpdateOptions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'opt_1', label: 'Opção Premium' })
      ])
    );
  });

  it('allows setting conditional action to "jump" and selecting target question', () => {
    const onUpdateOptions = vi.fn();
    const currentQuestion = {
      id: 'q1',
      type: 'multiple_choice',
      options: [
        { id: 'opt_1', label: 'Opção 1', action: 'next' }
      ]
    };

    const { rerender } = render(
      <QuestionOptionsConfig
        currentQuestion={currentQuestion}
        allQuestions={allQuestions}
        onUpdateOptions={onUpdateOptions}
      />
    );

    const actionSelect = screen.getByTestId('option-action-select-0');
    fireEvent.change(actionSelect, { target: { value: 'jump' } });

    expect(onUpdateOptions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ action: 'jump', jump_to_question_id: 'q2' })
      ])
    );

    // Rerender with action jump to verify target select
    rerender(
      <QuestionOptionsConfig
        currentQuestion={{
          ...currentQuestion,
          options: [{ id: 'opt_1', label: 'Opção 1', action: 'jump', jump_to_question_id: 'q2' }]
        }}
        allQuestions={allQuestions}
        onUpdateOptions={onUpdateOptions}
      />
    );

    const targetSelect = screen.getByTestId('option-target-select-0');
    fireEvent.change(targetSelect, { target: { value: 'q3' } });
    expect(onUpdateOptions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ jump_to_question_id: 'q3' })
      ])
    );
  });

  it('allows setting action to "end" (Finalizar formulário)', () => {
    const onUpdateOptions = vi.fn();
    const currentQuestion = {
      id: 'q1',
      type: 'multiple_choice',
      options: [{ id: 'opt_1', label: 'Opção 1', action: 'next' }]
    };

    render(
      <QuestionOptionsConfig
        currentQuestion={currentQuestion}
        allQuestions={allQuestions}
        onUpdateOptions={onUpdateOptions}
      />
    );

    const actionSelect = screen.getByTestId('option-action-select-0');
    fireEvent.change(actionSelect, { target: { value: 'end' } });

    expect(onUpdateOptions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ action: 'end' })
      ])
    );
  });

  it('allows adding a new option', () => {
    const onUpdateOptions = vi.fn();
    const currentQuestion = {
      id: 'q1',
      type: 'multiple_choice',
      options: [{ id: 'opt_1', label: 'Opção 1', action: 'next' }]
    };

    render(
      <QuestionOptionsConfig
        currentQuestion={currentQuestion}
        allQuestions={allQuestions}
        onUpdateOptions={onUpdateOptions}
      />
    );

    const addBtn = screen.getByTestId('add-option-btn');
    fireEvent.click(addBtn);

    expect(onUpdateOptions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'opt_1' }),
        expect.objectContaining({ label: 'Opção 2', action: 'next' })
      ])
    );
  });

  it('groups target questions by branch/flow in optgroup elements', () => {
    const flows = [
      { id: 'default', name: 'Fluxo Principal' },
      { id: 'flow_b', name: 'Ramificação B' }
    ];
    const questionsWithFlows = [
      { id: 'q1', title: 'Primeira Pergunta', type: 'multiple_choice', flow_id: 'default' },
      { id: 'q2', title: 'Segunda Pergunta', type: 'short_text', flow_id: 'default' },
      { id: 'q3', title: 'Pergunta na Ramificação B', type: 'short_text', flow_id: 'flow_b' }
    ];
    const currentQuestion = {
      id: 'q1',
      type: 'multiple_choice',
      flow_id: 'default',
      options: [{ id: 'opt_1', label: 'Opção 1', action: 'jump', jump_to_question_id: 'q3' }]
    };

    render(
      <QuestionOptionsConfig
        currentQuestion={currentQuestion}
        allQuestions={questionsWithFlows}
        flows={flows}
        onUpdateOptions={vi.fn()}
      />
    );

    const targetSelect = screen.getByTestId('option-target-select-0');
    expect(targetSelect).toBeDefined();

    const optgroups = targetSelect.querySelectorAll('optgroup');
    expect(optgroups.length).toBe(2);
    expect(optgroups[0].label).toBe('Fluxo Principal');
    expect(optgroups[1].label).toBe('Ramificação B');
  });

  it('allows setting action to "jump_flow" (Ir para outra ramificação) and selects target branch', () => {
    const onUpdateOptions = vi.fn();
    const flows = [
      { id: 'default', name: 'Fluxo Principal' },
      { id: 'flow_b', name: 'Ramificação B' },
      { id: 'flow_c', name: 'Ramificação C' }
    ];
    const currentQuestion = {
      id: 'q1',
      type: 'multiple_choice',
      flow_id: 'default',
      options: [{ id: 'opt_1', label: 'Opção 1', action: 'next' }]
    };

    const { rerender } = render(
      <QuestionOptionsConfig
        currentQuestion={currentQuestion}
        allQuestions={allQuestions}
        flows={flows}
        onUpdateOptions={onUpdateOptions}
      />
    );

    const actionSelect = screen.getByTestId('option-action-select-0');
    fireEvent.change(actionSelect, { target: { value: 'jump_flow' } });

    expect(onUpdateOptions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ action: 'jump_flow', jump_to_flow_id: 'flow_b' })
      ])
    );

    rerender(
      <QuestionOptionsConfig
        currentQuestion={{
          ...currentQuestion,
          options: [{ id: 'opt_1', label: 'Opção 1', action: 'jump_flow', jump_to_flow_id: 'flow_b' }]
        }}
        allQuestions={allQuestions}
        flows={flows}
        onUpdateOptions={onUpdateOptions}
      />
    );

    const flowSelect = screen.getByTestId('option-flow-select-0');
    expect(flowSelect).toBeInTheDocument();
    fireEvent.change(flowSelect, { target: { value: 'flow_c' } });

    expect(onUpdateOptions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ jump_to_flow_id: 'flow_c' })
      ])
    );
  });
});
