import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FormsManagement from './FormsManagement';
import { ToastProvider } from '../../context/ToastContext';

describe('FormsManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'fake-jwt-token');
  });

  it('renders forms header and "Criar formulário" button', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    expect(screen.getByRole('heading', { name: 'Todos os formulários' })).toBeDefined();
    expect(screen.getByTestId('open-create-form-modal-btn')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId('forms-empty-state')).toBeDefined();
    });
  });

  it('opens create form modal and submits new form', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 101,
          title: 'Pesquisa de Satisfação',
          slug: 'pesq123',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 101,
          title: 'Pesquisa de Satisfação',
          slug: 'pesq123',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Qual é o seu nome completo?' }
          ]
        }),
      });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    // Abre o modal
    const openBtn = screen.getByTestId('open-create-form-modal-btn');
    fireEvent.click(openBtn);

    expect(screen.getByText('Qual é o título do seu formulário?')).toBeDefined();

    const input = screen.getByTestId('create-form-title-input');
    fireEvent.change(input, { target: { value: 'Pesquisa de Satisfação' } });

    const submitBtn = screen.getByTestId('create-form-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Pesquisa de Satisfação')).toBeDefined();
      expect(screen.getByTestId('editor-back-btn')).toBeDefined();
    });
  });

  it('filters forms using search input', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: 'Formulário Alpha',
          slug: 'alpha1',
          status: 'PUBLICADO',
          responses_count: 5,
          completion_rate: 80.0,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Formulário Beta',
          slug: 'beta2',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Formulário Alpha')).toBeDefined();
      expect(screen.getByText('Formulário Beta')).toBeDefined();
    });

    const searchInput = screen.getByTestId('search-forms-input');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Formulário Alpha')).toBeDefined();
    expect(screen.queryByText('Formulário Beta')).toBeNull();
  });

  it('renders public form link pointing to /form/{slug}', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: 'Formulário Inicial',
          slug: '9g00wTk7',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
        }
      ],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Formulário Inicial')).toBeDefined();
    });

    const linkEl = screen.getByTestId('form-public-link-1');
    expect(linkEl).toBeDefined();
    expect(linkEl.getAttribute('href')).toBe('/form/9g00wTk7');
    expect(linkEl.textContent).toContain('/form/9g00wTk7');
  });

  it('opens FormEditor when clicking anywhere on the form row', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 42,
          title: 'Formulário Clicável',
          slug: 'clicavel-123',
          status: 'PUBLICADO',
          responses_count: 3,
          completion_rate: 100.0,
          created_at: new Date().toISOString(),
          questions: []
        }
      ],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-item-42')).toBeDefined();
    });

    const row = screen.getByTestId('form-item-42');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByTestId('editor-back-btn')).toBeDefined();
    });
  });

  it('allows selecting individual forms and displays bulk action bar', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 10,
          title: 'Formulário 1',
          slug: 'form-1',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
        },
        {
          id: 20,
          title: 'Formulário 2',
          slug: 'form-2',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-item-10')).toBeDefined();
      expect(screen.getByTestId('form-item-20')).toBeDefined();
    });

    // Barra de ação em massa não deve estar visível inicialmente
    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();

    // Seleciona o primeiro formulário
    const check1 = screen.getByTestId('select-form-checkbox-10');
    fireEvent.click(check1);

    expect(screen.getByTestId('bulk-action-bar')).toBeDefined();
    expect(screen.getByTestId('bulk-selected-count').textContent).toContain('1 formulário selecionado');

    // Seleciona o segundo formulário
    const check2 = screen.getByTestId('select-form-checkbox-20');
    fireEvent.click(check2);

    expect(screen.getByTestId('bulk-selected-count').textContent).toContain('2 formulários selecionados');

    // Clica em "Desmarcar"
    const clearBtn = screen.getByTestId('bulk-clear-selection-btn');
    fireEvent.click(clearBtn);

    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();
  });

  it('selects and deselects all forms using table header checkbox', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: 'Form A',
          slug: 'a',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Form B',
          slug: 'b',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-all-forms-checkbox')).toBeDefined();
    });

    const headerCheckbox = screen.getByTestId('select-all-forms-checkbox');
    fireEvent.click(headerCheckbox);

    // Todos devem estar selecionados
    expect(screen.getByTestId('bulk-selected-count').textContent).toContain('2 formulários selecionados');

    // Desmarca todos clicando no header novamente
    fireEvent.click(headerCheckbox);
    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();
  });

  it('opens bulk delete modal and cancels without deleting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 5,
          title: 'Form Para Manter',
          slug: 'manter',
          status: 'PUBLICADO',
          responses_count: 0,
          completion_rate: 0.0,
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-form-checkbox-5')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('select-form-checkbox-5'));
    fireEvent.click(screen.getByTestId('bulk-delete-trigger-btn'));

    // Modal deve estar aberto
    expect(screen.getByTestId('bulk-delete-modal')).toBeDefined();
    expect(screen.getByTestId('bulk-delete-title').textContent).toContain('Excluir "Form Para Manter"?');

    // Cancela
    fireEvent.click(screen.getByTestId('cancel-bulk-delete-btn'));
    expect(screen.queryByTestId('bulk-delete-modal')).toBeNull();
    expect(screen.getByTestId('form-item-5')).toBeDefined();
  });

  it('executes bulk delete and sends selected form_ids to backend', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 11,
            title: 'Form Deletar 1',
            slug: 'del1',
            status: 'PUBLICADO',
            responses_count: 0,
            completion_rate: 0.0,
            created_at: new Date().toISOString(),
          },
          {
            id: 22,
            title: 'Form Deletar 2',
            slug: 'del2',
            status: 'PUBLICADO',
            responses_count: 0,
            completion_rate: 0.0,
            created_at: new Date().toISOString(),
          },
          {
            id: 33,
            title: 'Form Ficar',
            slug: 'ficar',
            status: 'PUBLICADO',
            responses_count: 0,
            completion_rate: 0.0,
            created_at: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deleted_count: 2,
          message: '2 formulários excluídos com sucesso.',
        }),
      });

    render(
      <ToastProvider>
        <FormsManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-item-11')).toBeDefined();
      expect(screen.getByTestId('form-item-22')).toBeDefined();
      expect(screen.getByTestId('form-item-33')).toBeDefined();
    });

    // Seleciona 11 e 22
    fireEvent.click(screen.getByTestId('select-form-checkbox-11'));
    fireEvent.click(screen.getByTestId('select-form-checkbox-22'));

    // Clica para abrir modal de exclusão
    fireEvent.click(screen.getByTestId('bulk-delete-trigger-btn'));
    expect(screen.getByTestId('bulk-delete-title').textContent).toContain('Excluir 2 formulários?');

    // Confirma exclusão
    fireEvent.click(screen.getByTestId('confirm-bulk-delete-btn'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/forms/bulk-delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ form_ids: [11, 22] }),
        })
      );
    });

    // Formulários 11 e 22 somem, 33 permanece
    await waitFor(() => {
      expect(screen.queryByTestId('form-item-11')).toBeNull();
      expect(screen.queryByTestId('form-item-22')).toBeNull();
      expect(screen.getByTestId('form-item-33')).toBeDefined();
    });
  });
});


