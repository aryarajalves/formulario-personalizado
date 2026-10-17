import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultsTab from './ResultsTab';

describe('ResultsTab Component', () => {
  const mockResponses = [
    {
      id: 1,
      contact_name: 'Aryaraj Fernandes',
      contact_email: 'aryaraj@gmail.com',
      contact_phone: '+55 11 99999-9999',
      created_at: '2026-10-16T19:04:00Z',
      answers: [
        { question_title: 'Qual é o seu nome completo?', answer: 'Aryaraj Fernandes' },
        { question_title: 'Qual é o seu e-mail?', answer: 'aryaraj@gmail.com' },
        { question_title: 'Você confirma esta opção?', answer: 'Sim' },
        { question_title: 'Qual a melhor data?', answer: 'Hoje' },
        { question_title: 'Como você avalia nosso atendimento?', answer: 'Excelente' }
      ]
    },
    {
      id: 2,
      contact_name: 'Carlos Oliveira',
      contact_email: 'carlos@teste.com',
      contact_phone: '',
      created_at: '2026-10-16T18:19:00Z',
      answers: [
        { question_title: 'Qual seu nome?', answer: 'Carlos' }
      ]
    }
  ];

  it('renders table with contacts and compact preview chips (max 2)', () => {
    render(
      <ResultsTab
        responses={mockResponses}
        responsesPage={1}
        responsesTotal={2}
        responsesTotalPages={1}
        loadingResponses={false}
        setResponsesPage={vi.fn()}
        onGoToShare={vi.fn()}
      />
    );

    expect(screen.getAllByText('Aryaraj Fernandes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('aryaraj@gmail.com').length).toBeGreaterThan(0);
    expect(screen.getByText('+55 11 99999-9999')).toBeDefined();

    // Primeiro item tem 5 respostas: mostra 2 chips + botão "+3 mais"
    expect(screen.getByText('Qual é o seu nome completo?:')).toBeDefined();
    expect(screen.getByText('Qual é o seu e-mail?:')).toBeDefined();
    expect(screen.getByTestId('view-more-btn-0')).toBeDefined();
    expect(screen.getByText('+3 mais')).toBeDefined();

    // Segundo item tem 1 resposta: não mostra "+X mais"
    expect(screen.queryByTestId('view-more-btn-1')).toBeNull();
  });

  it('opens detailed responses modal upon clicking "+X mais" and displays all answers and contact info', () => {
    render(
      <ResultsTab
        responses={mockResponses}
        responsesPage={1}
        responsesTotal={2}
        responsesTotalPages={1}
        loadingResponses={false}
        setResponsesPage={vi.fn()}
        onGoToShare={vi.fn()}
      />
    );

    // Modal inicialmente não existe
    expect(screen.queryByTestId('response-details-modal')).toBeNull();

    // Clica no botão "+3 mais"
    const viewMoreBtn = screen.getByTestId('view-more-btn-0');
    fireEvent.click(viewMoreBtn);

    // Modal é exibido com detalhes
    expect(screen.getByTestId('response-details-modal')).toBeDefined();
    expect(screen.getByText('Resposta #1')).toBeDefined();
    expect(screen.getByText('Perguntas e Respostas (5)')).toBeDefined();

    expect(screen.getByTestId('modal-qa-item-0')).toBeDefined();
    expect(screen.getByTestId('modal-qa-item-1')).toBeDefined();
    expect(screen.getByTestId('modal-qa-item-2')).toBeDefined();
    expect(screen.getByTestId('modal-qa-item-3')).toBeDefined();
    expect(screen.getByTestId('modal-qa-item-4')).toBeDefined();

    expect(screen.getByText('Você confirma esta opção?')).toBeDefined();
    expect(screen.getByText('Como você avalia nosso atendimento?')).toBeDefined();

    // Fecha pelo botão X
    const closeBtn = screen.getByTestId('close-response-modal-btn');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('response-details-modal')).toBeNull();
  });

  it('opens detailed responses modal upon clicking "Ver detalhes" button and closes via primary button', () => {
    render(
      <ResultsTab
        responses={mockResponses}
        responsesPage={1}
        responsesTotal={2}
        responsesTotalPages={1}
        loadingResponses={false}
        setResponsesPage={vi.fn()}
        onGoToShare={vi.fn()}
      />
    );

    const viewDetailsBtn = screen.getByTestId('view-details-btn-1');
    fireEvent.click(viewDetailsBtn);

    expect(screen.getByTestId('response-details-modal')).toBeDefined();
    expect(screen.getByText('Resposta #2')).toBeDefined();
    expect(screen.getByText('Perguntas e Respostas (1)')).toBeDefined();

    const confirmCloseBtn = screen.getByTestId('confirm-close-response-modal-btn');
    fireEvent.click(confirmCloseBtn);

    expect(screen.queryByTestId('response-details-modal')).toBeNull();
  });

  it('renders empty state when there are no responses', () => {
    const onShare = vi.fn();
    render(
      <ResultsTab
        responses={[]}
        responsesPage={1}
        responsesTotal={0}
        responsesTotalPages={1}
        loadingResponses={false}
        setResponsesPage={vi.fn()}
        onGoToShare={onShare}
      />
    );

    expect(screen.getByTestId('results-empty')).toBeDefined();
    expect(screen.getByText('Nenhuma resposta encontrada neste filtro')).toBeDefined();

    const shareBtn = screen.getByRole('button', { name: /Ir para Compartilhar/i });
    fireEvent.click(shareBtn);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('renders status filter tabs with badges and triggers setResponsesFilter on click', () => {
    const setFilterMock = vi.fn();
    const setPageMock = vi.fn();

    render(
      <ResultsTab
        responses={mockResponses}
        responsesPage={1}
        responsesTotal={2}
        responsesTotalPages={1}
        responsesFilter="ALL"
        setResponsesFilter={setFilterMock}
        responsesCounts={{ all: 10, completed: 7, partial: 3 }}
        loadingResponses={false}
        setResponsesPage={setPageMock}
        onGoToShare={vi.fn()}
      />
    );

    expect(screen.getByTestId('filter-tab-all')).toBeDefined();
    expect(screen.getByTestId('filter-tab-completed')).toBeDefined();
    expect(screen.getByTestId('filter-tab-partial')).toBeDefined();

    expect(screen.getByText('Concluídas (100%)')).toBeDefined();
    expect(screen.getByText('Parciais (Em andamento)')).toBeDefined();

    // Clica no filtro de Concluídas
    fireEvent.click(screen.getByTestId('filter-tab-completed'));
    expect(setFilterMock).toHaveBeenCalledWith('CONCLUIDO');
    expect(setPageMock).toHaveBeenCalledWith(1);

    // Clica no filtro de Parciais
    fireEvent.click(screen.getByTestId('filter-tab-partial'));
    expect(setFilterMock).toHaveBeenCalledWith('PARCIAL');
  });

  it('renders export CSV button and triggers download call', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['id;contato\n1;Aryaraj'], { type: 'text/csv' })
    });
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    render(
      <ResultsTab
        formId={1}
        formSlug="meu-formulario"
        responses={mockResponses}
        responsesPage={1}
        responsesTotal={2}
        responsesTotalPages={1}
        responsesFilter="ALL"
        setResponsesFilter={vi.fn()}
        responsesCounts={{ all: 2, completed: 2, partial: 0 }}
        loadingResponses={false}
        setResponsesPage={vi.fn()}
        onGoToShare={vi.fn()}
      />
    );

    const exportBtn = screen.getByTestId('export-csv-btn');
    expect(exportBtn).toBeDefined();

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/forms/1/responses/export'),
        expect.anything()
      );
    });
  });
});

