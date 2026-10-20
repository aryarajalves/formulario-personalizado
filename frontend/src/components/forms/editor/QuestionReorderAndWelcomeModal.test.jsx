import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FormEditor from '../FormEditor';
import { ToastProvider } from '../../../context/ToastContext';

describe('FormEditor - Reordering, Ending Screen Limit & Welcome Screen Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'mock_token');
  });

  it('allows reordering questions via up and down arrow buttons', async () => {
    let savedPayload = null;
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === 'PUT') {
        savedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            title: 'Formulário Reordenação',
            slug: 'reorder-test',
            status: 'PUBLICADO',
            questions: savedPayload.questions,
            ending_screens: [],
            welcome_screen: {}
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Reordenação',
          slug: 'reorder-test',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Primeira Pergunta' },
            { id: 'q2', type: 'short_text', title: 'Segunda Pergunta' },
            { id: 'q3', type: 'short_text', title: 'Terceira Pergunta' }
          ],
          ending_screens: [],
          welcome_screen: {}
        })
      });
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Primeira Pergunta')).toBeDefined();
    });

    // Validar botões de mover
    const moveUp0 = screen.getByTestId('move-question-up-0');
    const moveDown0 = screen.getByTestId('move-question-down-0');

    // A primeira questão não pode subir
    expect(moveUp0.disabled).toBe(true);
    expect(moveDown0.disabled).toBe(false);

    // Mover questão 0 para baixo (vai para index 1)
    fireEvent.click(moveDown0);

    // Clica no botão Salvar
    const saveBtn = screen.getByTestId('editor-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(savedPayload).not.toBeNull();
      expect(savedPayload.questions[0].title).toBe('Segunda Pergunta');
      expect(savedPayload.questions[1].title).toBe('Primeira Pergunta');
    });
  });

  it('allows moving questions via drag and drop simulation', async () => {
    let savedPayload = null;
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === 'PUT') {
        savedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            title: 'Formulário Drag',
            slug: 'drag-test',
            status: 'PUBLICADO',
            questions: savedPayload.questions,
            ending_screens: [],
            welcome_screen: {}
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Drag',
          slug: 'drag-test',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Pergunta Alpha' },
            { id: 'q2', type: 'short_text', title: 'Pergunta Beta' }
          ],
          ending_screens: [],
          welcome_screen: {}
        })
      });
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Pergunta Alpha')).toBeDefined();
    });

    const item0 = screen.getByTestId('question-item-0');
    const item1 = screen.getByTestId('question-item-1');

    // Simula arrastar item 0 e soltar sobre item 1
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('0')
    };

    fireEvent.dragStart(item0, { dataTransfer });
    fireEvent.dragOver(item1, { dataTransfer });
    fireEvent.drop(item1, { dataTransfer });

    const saveBtn = screen.getByTestId('editor-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(savedPayload).not.toBeNull();
      expect(savedPayload.questions[0].title).toBe('Pergunta Beta');
      expect(savedPayload.questions[1].title).toBe('Pergunta Alpha');
    });
  });

  it('restricts ending screens to only 1 and hides add button when 1 already exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'Formulário Tela Final',
        slug: 'ending-test',
        status: 'PUBLICADO',
        questions: [{ id: 'q1', type: 'short_text', title: 'Questão 1' }],
        ending_screens: [
          { id: 'end_1', title: 'Recebemos sua aplicação' }
        ],
        welcome_screen: {}
      })
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Recebemos sua aplicação')).toBeDefined();
    });

    // Como já existe 1 tela final, o botão "+ Adicionar tela final" não deve ser renderizado
    expect(screen.queryByTestId('add-ending-screen-btn')).toBeNull();
  });

  it('opens confirmation popup in center when clicking trash on welcome screen', async () => {
    let savedPayload = null;
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === 'PUT') {
        savedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            title: 'Formulário Boas-Vindas',
            slug: 'welcome-test',
            status: 'PUBLICADO',
            questions: [{ id: 'q1', type: 'short_text', title: 'Questão 1' }],
            ending_screens: [],
            welcome_screen: savedPayload.welcome_screen
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Boas-Vindas',
          slug: 'welcome-test',
          status: 'PUBLICADO',
          questions: [{ id: 'q1', type: 'short_text', title: 'Questão 1' }],
          ending_screens: [],
          welcome_screen: {
            enabled: true,
            title: 'Boas-vindas VIP',
            button_text: 'Começar'
          }
        })
      });
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Boas-vindas VIP')).toBeDefined();
    });

    // Clica no ícone de lixeira da tela de boas-vindas
    const trashBtn = screen.getByTestId('remove-welcome-screen-btn');
    fireEvent.click(trashBtn);

    // Deve abrir o popup centralizado com o título e botões
    expect(screen.getByTestId('confirm-delete-modal-overlay')).toBeDefined();
    expect(screen.getByTestId('confirm-delete-modal-content')).toBeDefined();
    expect(screen.getByText('Excluir Tela de Boas-Vindas')).toBeDefined();
    expect(screen.getByText(/Tem certeza que deseja excluir permanentemente/i)).toBeDefined();

    // Clica em Cancelar primeiro
    fireEvent.click(screen.getByTestId('cancel-delete-btn'));
    expect(screen.queryByTestId('confirm-delete-modal-overlay')).toBeNull();

    // Clica novamente e confirma exclusão
    fireEvent.click(trashBtn);
    fireEvent.click(screen.getByTestId('confirm-delete-btn'));

    // Clica no botão Salvar
    const saveBtn = screen.getByTestId('editor-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(savedPayload).not.toBeNull();
      expect(savedPayload.welcome_screen.enabled).toBe(false);
    });
  });
});
