import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuestionTypePickerModal from './QuestionTypePickerModal';

describe('QuestionTypePickerModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <QuestionTypePickerModal isOpen={false} onClose={vi.fn()} onSelectType={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <QuestionTypePickerModal isOpen={true} onClose={vi.fn()} onSelectType={vi.fn()} />
    );
    expect(screen.getByText('Selecione o tipo de questão')).toBeInTheDocument();
    expect(screen.getByText('Múltipla escolha')).toBeInTheDocument();
  });

  it('does NOT close when clicking outside on the overlay', () => {
    const onClose = vi.fn();
    render(
      <QuestionTypePickerModal isOpen={true} onClose={onClose} onSelectType={vi.fn()} />
    );

    const overlay = screen.getByTestId('question-type-picker-overlay');
    fireEvent.click(overlay);

    // Deve permanecer aberto (não chama onClose)
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes only when clicking the explicit close button', () => {
    const onClose = vi.fn();
    render(
      <QuestionTypePickerModal isOpen={true} onClose={onClose} onSelectType={vi.fn()} />
    );

    const closeBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selects question type and closes modal when type button is clicked', () => {
    const onClose = vi.fn();
    const onSelectType = vi.fn();
    render(
      <QuestionTypePickerModal isOpen={true} onClose={onClose} onSelectType={onSelectType} />
    );

    const multipleChoiceBtn = screen.getByTestId('question-type-multiple_choice');
    fireEvent.click(multipleChoiceBtn);

    expect(onSelectType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'multiple_choice', label: 'Múltipla escolha' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders statement (Mensagem de Término / Desqualificação) without input fields and selects it', () => {
    const onSelectType = vi.fn();
    render(
      <QuestionTypePickerModal isOpen={true} onClose={vi.fn()} onSelectType={onSelectType} />
    );

    const statementBtn = screen.getByTestId('question-type-statement');
    expect(statementBtn).toBeInTheDocument();
    expect(screen.getByText('Mensagem de Término / Desqualificação')).toBeInTheDocument();

    fireEvent.click(statementBtn);
    expect(onSelectType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'statement', category: 'ESTRUTURA & TÉRMINO' })
    );
  });
});
