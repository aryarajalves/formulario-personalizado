import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlowBranchSection from './FlowBranchSection';

describe('FlowBranchSection Component - Ramificações e Múltiplos Fluxos', () => {
  const mockForm = {
    id: 1,
    title: 'Formulário com Ramificações',
    flows: [
      { id: 'default', name: 'Fluxo Principal' },
      { id: 'flow_b', name: 'Ramificação B' }
    ],
    questions: [
      { id: 'q1', type: 'short_text', title: 'Nome no Principal', flow_id: 'default' },
      { id: 'q2', type: 'multiple_choice', title: 'Escolha no Principal', flow_id: 'default' },
      { id: 'q3', type: 'short_text', title: 'Pergunta na Ramificação B', flow_id: 'flow_b' }
    ]
  };

  it('renders both Fluxo Principal and Ramificação B with their respective questions', () => {
    render(
      <FlowBranchSection
        form={mockForm}
        activeItemType="question"
        setActiveItemType={vi.fn()}
        selectedQuestionIndex={0}
        setSelectedQuestionIndex={vi.fn()}
        openTypePickerForAdd={vi.fn()}
        promptDeleteQuestion={vi.fn()}
        handleMoveQuestion={vi.fn()}
        handleAddFlow={vi.fn()}
        handleRenameFlow={vi.fn()}
        promptDeleteFlow={vi.fn()}
      />
    );

    // Deve exibir o cabeçalho do fluxo principal e da ramificação B
    expect(screen.getByText('Fluxo Principal')).toBeDefined();
    expect(screen.getByText('Ramificação B')).toBeDefined();

    // Questões do fluxo principal
    expect(screen.getByText('Nome no Principal')).toBeDefined();
    expect(screen.getByText('Escolha no Principal')).toBeDefined();

    // Questão da ramificação B
    expect(screen.getByText('Pergunta na Ramificação B')).toBeDefined();

    // Badges de numeração: 1, 2 para principal e B1 para ramificação B
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('B1')).toBeDefined();
  });

  it('allows clicking "+ Nova Ramificação / Fluxo" to create a new branch', () => {
    const handleAddFlow = vi.fn();
    render(
      <FlowBranchSection
        form={mockForm}
        activeItemType="question"
        setActiveItemType={vi.fn()}
        selectedQuestionIndex={0}
        setSelectedQuestionIndex={vi.fn()}
        openTypePickerForAdd={vi.fn()}
        promptDeleteQuestion={vi.fn()}
        handleMoveQuestion={vi.fn()}
        handleAddFlow={handleAddFlow}
        handleRenameFlow={vi.fn()}
        promptDeleteFlow={vi.fn()}
      />
    );

    const addBranchBtn = screen.getByTestId('add-new-branch-btn');
    expect(addBranchBtn).toBeDefined();
    fireEvent.click(addBranchBtn);
    expect(handleAddFlow).toHaveBeenCalledTimes(1);
  });

  it('allows renaming a branch and triggers handleRenameFlow', () => {
    const handleRenameFlow = vi.fn();
    render(
      <FlowBranchSection
        form={mockForm}
        activeItemType="question"
        setActiveItemType={vi.fn()}
        selectedQuestionIndex={0}
        setSelectedQuestionIndex={vi.fn()}
        openTypePickerForAdd={vi.fn()}
        promptDeleteQuestion={vi.fn()}
        handleMoveQuestion={vi.fn()}
        handleAddFlow={vi.fn()}
        handleRenameFlow={handleRenameFlow}
        promptDeleteFlow={vi.fn()}
      />
    );

    // Clica no botão de renomear da Ramificação B
    const renameBtn = screen.getByTestId('rename-flow-btn-flow_b');
    fireEvent.click(renameBtn);

    const input = screen.getByTestId('flow-name-input-flow_b');
    expect(input).toBeDefined();
    fireEvent.change(input, { target: { value: 'Fluxo VIP' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleRenameFlow).toHaveBeenCalledWith('flow_b', 'Fluxo VIP');
  });

  it('triggers promptDeleteFlow when clicking delete button on alternate branch (never on default)', () => {
    const promptDeleteFlow = vi.fn();
    render(
      <FlowBranchSection
        form={mockForm}
        activeItemType="question"
        setActiveItemType={vi.fn()}
        selectedQuestionIndex={0}
        setSelectedQuestionIndex={vi.fn()}
        openTypePickerForAdd={vi.fn()}
        promptDeleteQuestion={vi.fn()}
        handleMoveQuestion={vi.fn()}
        handleAddFlow={vi.fn()}
        handleRenameFlow={vi.fn()}
        promptDeleteFlow={promptDeleteFlow}
      />
    );

    // Não deve existir botão de deletar o fluxo principal
    expect(screen.queryByTestId('delete-flow-btn-default')).toBeNull();

    // Deve existir botão de deletar a Ramificação B
    const deleteBranchBtn = screen.getByTestId('delete-flow-btn-flow_b');
    expect(deleteBranchBtn).toBeDefined();
    fireEvent.click(deleteBranchBtn);

    expect(promptDeleteFlow).toHaveBeenCalledWith('flow_b');
  });

  it('triggers openTypePickerForAdd with correct flow.id when clicking add question inside that branch', () => {
    const openTypePickerForAdd = vi.fn();
    render(
      <FlowBranchSection
        form={mockForm}
        activeItemType="question"
        setActiveItemType={vi.fn()}
        selectedQuestionIndex={0}
        setSelectedQuestionIndex={vi.fn()}
        openTypePickerForAdd={openTypePickerForAdd}
        promptDeleteQuestion={vi.fn()}
        handleMoveQuestion={vi.fn()}
        handleAddFlow={vi.fn()}
        handleRenameFlow={vi.fn()}
        promptDeleteFlow={vi.fn()}
      />
    );

    // Clica em adicionar questão na Ramificação B
    const addInBranchB = screen.getByTestId('add-question-flow-btn-flow_b');
    fireEvent.click(addInBranchB);
    expect(openTypePickerForAdd).toHaveBeenCalledWith('flow_b');

    // Clica em adicionar questão no Fluxo Principal
    const addInDefault = screen.getByTestId('add-question-btn');
    fireEvent.click(addInDefault);
    expect(openTypePickerForAdd).toHaveBeenCalledWith('default');
  });
});
