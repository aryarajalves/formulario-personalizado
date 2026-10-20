import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FormEditor from './FormEditor';
import { ToastProvider } from '../../context/ToastContext';

describe('FormEditor Component - Navigation, Questions & Modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'mock_token');
  });

  it('renders editor navigation, tabs and questions list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'RETIRO CORAÇÃO CIGANO 2026',
        slug: 'retiro2026',
        status: 'PUBLICADO',
        questions: [
          {
            id: 'q1',
            type: 'short_text',
            category: 'TEXTO E NÚMERO',
            title: 'Qual é o seu nome completo?',
            required: true,
            placeholder: 'Digite seu nome...'
          }
        ]
      })
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('RETIRO CORAÇÃO CIGANO 2026')).toBeDefined();
      expect(screen.getByText('Qual é o seu nome completo?')).toBeDefined();
    });

    expect(screen.getByText('Editar')).toBeDefined();
    expect(screen.getByText('Integrar')).toBeDefined();
    expect(screen.getByText('Compartilhar')).toBeDefined();
    expect(screen.getByText('Resultados')).toBeDefined();

    expect(screen.getByText('Desktop')).toBeDefined();
    expect(screen.getByText('Tablet')).toBeDefined();
    expect(screen.getByText('Celular')).toBeDefined();

    expect(screen.getByTestId('add-question-btn')).toBeDefined();
  });

  it('opens type picker modal and adds a new question', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste',
          slug: 'teste',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Primeira Pergunta' }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste',
          slug: 'teste',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Primeira Pergunta' },
            { id: 'q2', type: 'email', title: 'Qual é o seu e-mail? *' }
          ]
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Formulário Teste')).toBeDefined();
    });

    const addBtn = screen.getByTestId('add-question-btn');
    fireEvent.click(addBtn);

    expect(screen.getByText('Selecione o tipo de questão')).toBeDefined();

    const emailOption = screen.getByTestId('question-type-email');
    fireEvent.click(emailOption);

    const saveBtn = screen.getByTestId('editor-save-btn');
    expect(saveBtn).toBeDefined();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/forms/1'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('renders yellow star icon for required questions in sidebar and allows changing question type', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Tipos',
          slug: 'form-teste-tipos',
          status: 'PUBLICADO',
          questions: [
            {
              id: 'q1',
              type: 'short_text',
              title: 'Qual é o seu nome completo?',
              required: true,
              tag: '1 →'
            }
          ],
          ending_screens: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Tipos',
          slug: 'form-teste-tipos',
          status: 'PUBLICADO',
          questions: [
            {
              id: 'q1',
              type: 'email',
              title: 'Qual é o seu nome completo?',
              required: true,
              tag: '1 →'
            }
          ],
          ending_screens: []
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Qual é o seu nome completo?')).toBeDefined();
    });

    expect(screen.getByTestId('required-star-0')).toBeDefined();
    expect(screen.getByTestId('question-tag-star')).toBeDefined();

    const changeTypeBtn = screen.getByTestId('change-question-type-btn');
    expect(changeTypeBtn).toBeDefined();
    fireEvent.click(changeTypeBtn);

    expect(screen.getByText('Selecione o tipo de questão')).toBeDefined();

    const emailOption = screen.getByTestId('question-type-email');
    fireEvent.click(emailOption);

    await waitFor(() => {
      expect(screen.getByTestId('config-type-badge-clickable')).toBeDefined();
    });
  });

  it('allows clicking and editing question prefix/name at the top', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Tag',
          slug: 'form-teste-tag',
          status: 'PUBLICADO',
          questions: [
            {
              id: 'q1',
              type: 'short_text',
              title: 'Pergunta de Teste',
              required: false,
              tag: 'Passo 1'
            }
          ],
          ending_screens: []
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Passo 1')).toBeDefined();
    });

    const tagLabel = screen.getByTestId('interactive-question-tag-label');
    fireEvent.click(tagLabel);

    const tagInput = screen.getByTestId('interactive-question-tag-input');
    expect(tagInput).toBeDefined();

    fireEvent.change(tagInput, { target: { value: 'Etapa Inicial' } });
    fireEvent.blur(tagInput);

    await waitFor(() => {
      expect(screen.getByText('Etapa Inicial')).toBeDefined();
    });
  });

  it('opens confirmation popup before deleting a question and deletes on confirm', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Delete',
          slug: 'form-delete',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Primeira Questão' },
            { id: 'q2', type: 'email', title: 'Segunda Questão' }
          ],
          ending_screens: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Delete',
          slug: 'form-delete',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Primeira Questão' }
          ],
          ending_screens: []
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Segunda Questão')).toBeDefined();
    });

    const deleteBtn = screen.getByTestId('delete-question-btn-1');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('confirm-delete-modal-content')).toBeDefined();
    expect(screen.getByTestId('confirm-delete-title')).toBeDefined();
    expect(screen.getByText(/Tem certeza que deseja excluir permanentemente/i)).toBeDefined();

    const confirmBtn = screen.getByTestId('confirm-delete-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-modal-content')).toBeNull();
      expect(screen.queryByText('Segunda Questão')).toBeNull();
    });
  });

  it('allows editing question title via right config panel and saves when clicking Salvar', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Edição',
          slug: 'form-edicao',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'email', title: 'Qual é o seu e-mail?' }
          ],
          ending_screens: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Edição',
          slug: 'form-edicao',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'email', title: 'Por favor, informe seu melhor e-mail comercial' }
          ],
          ending_screens: []
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('config-question-title-input')).toBeDefined();
    });

    const titleInput = screen.getByTestId('config-question-title-input');
    expect(titleInput.value).toBe('Qual é o seu e-mail?');

    fireEvent.change(titleInput, { target: { value: 'Por favor, informe seu melhor e-mail comercial' } });
    fireEvent.blur(titleInput);

    // Clica no botão Salvar
    const saveBtn = screen.getByTestId('editor-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/forms/1'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('Por favor, informe seu melhor e-mail comercial')
        })
      );
    });
  });

  it('switches to Design tab and customizes form colors and presets', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário com Design',
          slug: 'form-design',
          status: 'PUBLICADO',
          questions: [{ id: 'q1', type: 'short_text', title: 'Pergunta 1' }],
          theme: { primaryColor: '#3b82f6', backgroundColor: '#090d16' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário com Design',
          slug: 'form-design',
          status: 'PUBLICADO',
          questions: [{ id: 'q1', type: 'short_text', title: 'Pergunta 1' }],
          theme: { primaryColor: '#8b5cf6', backgroundColor: '#0f0a1c' }
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-sidebar-design')).toBeDefined();
    });

    // Clica na aba Design
    fireEvent.click(screen.getByTestId('tab-sidebar-design'));

    // Verifica que o painel de design renderizou e não há aba Configurações
    expect(screen.getByTestId('design-theme-panel')).toBeDefined();
    expect(screen.queryByText('Configurações')).toBeNull();

    // Seleciona o preset Neon Violet
    const presetNeon = screen.getByTestId('preset-neon-violet');
    expect(presetNeon).toBeDefined();
    fireEvent.click(presetNeon);

    // Clica no botão Salvar
    const saveBtn = screen.getByTestId('editor-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/forms/1'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('#8b5cf6')
        })
      );
    });
  });

  it('renders mobile editor subnav and switches between questions, canvas, and config panels on mobile', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'Formulário Teste Mobile',
        slug: 'form-mobile',
        status: 'PUBLICADO',
        questions: [{ id: 'q1', type: 'short_text', title: 'Pergunta Mobile' }],
      })
    });

    const { container } = render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mobile-editor-subnav')).toBeDefined();
    });

    const workspace = container.querySelector('.editor-workspace');
    expect(workspace).toHaveClass('mobile-view-questions');

    // Alterna para o Preview (Canvas)
    const previewBtn = screen.getByTestId('mobile-subnav-canvas');
    fireEvent.click(previewBtn);
    expect(workspace).toHaveClass('mobile-view-canvas');

    // Alterna para Configuração
    const configBtn = screen.getByTestId('mobile-subnav-config');
    fireEvent.click(configBtn);
    expect(workspace).toHaveClass('mobile-view-config');

    // Volta para Questões
    const questionsBtn = screen.getByTestId('mobile-subnav-questions');
    fireEvent.click(questionsBtn);
    expect(workspace).toHaveClass('mobile-view-questions');
  });

  it('does not auto-save on change and saves only when clicking the manual Salvar button', async () => {
    let putCalled = false;
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === 'PUT') {
        putCalled = true;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            title: 'Formulário Sem AutoSave',
            slug: 'form-manual-save',
            status: 'PUBLICADO',
            questions: [{ id: 'q1', type: 'short_text', title: 'Título Modificado' }],
            ending_screens: []
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Sem AutoSave',
          slug: 'form-manual-save',
          status: 'PUBLICADO',
          questions: [{ id: 'q1', type: 'short_text', title: 'Título Original' }],
          ending_screens: []
        })
      });
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('config-question-title-input')).toBeDefined();
    });

    const titleInput = screen.getByTestId('config-question-title-input');
    const saveBtn = screen.getByTestId('editor-save-btn');

    // Inicialmente não tem classe has-changes
    expect(saveBtn).not.toHaveClass('has-changes');

    // Altera o título no input
    fireEvent.change(titleInput, { target: { value: 'Título Modificado' } });
    fireEvent.blur(titleInput);

    // NÃO deve ter disparado PUT automaticamente
    expect(putCalled).toBe(false);

    // O botão Salvar deve sinalizar alterações pendentes
    expect(saveBtn).toHaveClass('has-changes');

    // Clica no botão Salvar
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(putCalled).toBe(true);
      expect(saveBtn).not.toHaveClass('has-changes');
    });
  });
});



