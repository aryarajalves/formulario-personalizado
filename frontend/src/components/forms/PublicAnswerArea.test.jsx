import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PublicAnswerArea from './PublicAnswerArea';

describe('PublicAnswerArea Component', () => {
  it('renders multiple_choice options and selects on click', () => {
    const onAnswerChange = vi.fn();
    const currentQ = {
      id: 'q_choice',
      type: 'multiple_choice',
      options: [
        { id: 'opt_1', label: 'Opção Ouro' },
        { id: 'opt_2', label: 'Opção Prata' }
      ]
    };

    render(
      <PublicAnswerArea
        currentQ={currentQ}
        answers={{}}
        selectedDdi="+55"
        setSelectedDdi={vi.fn()}
        onAnswerChange={onAnswerChange}
        onNext={vi.fn()}
      />
    );

    const btn1 = screen.getByTestId('choice-opt-0');
    expect(btn1).toHaveTextContent('Opção Ouro');
    fireEvent.click(btn1);
    expect(onAnswerChange).toHaveBeenCalledWith('q_choice', 'Opção Ouro');
  });

  it('renders dropdown select and updates answer on change', () => {
    const onAnswerChange = vi.fn();
    const currentQ = {
      id: 'q_drop',
      type: 'dropdown',
      options: [
        { id: 'opt_1', label: 'São Paulo' },
        { id: 'opt_2', label: 'Rio de Janeiro' }
      ]
    };

    render(
      <PublicAnswerArea
        currentQ={currentQ}
        answers={{}}
        selectedDdi="+55"
        setSelectedDdi={vi.fn()}
        onAnswerChange={onAnswerChange}
        onNext={vi.fn()}
      />
    );

    const select = screen.getByTestId('dropdown-select');
    fireEvent.change(select, { target: { value: 'São Paulo' } });
    expect(onAnswerChange).toHaveBeenCalledWith('q_drop', 'São Paulo');
  });

  it('renders image_choice cards and selects on click', () => {
    const onAnswerChange = vi.fn();
    const currentQ = {
      id: 'q_img',
      type: 'image_choice',
      options: [
        { id: 'opt_1', label: 'Opção Visual 1', image_url: 'https://exemplo.com/1.png' },
        { id: 'opt_2', label: 'Opção Visual 2', image_url: '' }
      ]
    };

    render(
      <PublicAnswerArea
        currentQ={currentQ}
        answers={{}}
        selectedDdi="+55"
        setSelectedDdi={vi.fn()}
        onAnswerChange={onAnswerChange}
        onNext={vi.fn()}
      />
    );

    const card = screen.getByTestId('image-opt-0');
    expect(card).toHaveTextContent('Opção Visual 1');
    fireEvent.click(card);
    expect(onAnswerChange).toHaveBeenCalledWith('q_img', 'Opção Visual 1');
  });

  it('renders yes_no buttons and triggers answer change on Sim and Não', () => {
    const onAnswerChange = vi.fn();
    const currentQ = {
      id: 'q_yn',
      type: 'yes_no'
    };

    render(
      <PublicAnswerArea
        currentQ={currentQ}
        answers={{}}
        selectedDdi="+55"
        setSelectedDdi={vi.fn()}
        onAnswerChange={onAnswerChange}
        onNext={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('choice-yes'));
    expect(onAnswerChange).toHaveBeenCalledWith('q_yn', 'Sim');

    fireEvent.click(screen.getByTestId('choice-no'));
    expect(onAnswerChange).toHaveBeenCalledWith('q_yn', 'Não');
  });

  it('renders statement area without any input fields', () => {
    const currentQ = {
      id: 'q_stat',
      type: 'statement',
      description: 'Você não atende aos requisitos.'
    };

    render(
      <PublicAnswerArea
        currentQ={currentQ}
        answers={{}}
        selectedDdi="+55"
        setSelectedDdi={vi.fn()}
        onAnswerChange={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByTestId('public-statement-area')).toBeInTheDocument();
    expect(screen.getByText('Você não atende aos requisitos.')).toBeInTheDocument();
    expect(screen.queryByTestId('standard-input')).toBeNull();
  });

  it('renders interactive google_calendar booking component without plain text input', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slots_by_date: {} })
    });

    const currentQ = {
      id: 'q_cal',
      type: 'google_calendar'
    };

    render(
      <PublicAnswerArea
        currentQ={currentQ}
        answers={{}}
        selectedDdi="+55"
        setSelectedDdi={vi.fn()}
        onAnswerChange={vi.fn()}
        onNext={vi.fn()}
        formSlug="slug-teste"
      />
    );

    expect(screen.getByTestId('interactive-booking-calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-input')).toBeNull();
  });
});
