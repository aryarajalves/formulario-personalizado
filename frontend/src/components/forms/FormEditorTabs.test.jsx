import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FormEditor from './FormEditor';
import { ToastProvider } from '../../context/ToastContext';

describe('FormEditor Component - Tabs, Screens & Integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'mock_token');
  });

  it('navigates to Integrar tab and saves webhook URL', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Webhook Teste',
          slug: 'webhook-teste',
          status: 'PUBLICADO',
          webhook_url: '',
          questions: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Webhook Teste',
          slug: 'webhook-teste',
          status: 'PUBLICADO',
          webhook_url: 'https://webhook.site/teste-123',
          questions: []
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Formulário Webhook Teste')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('tab-integrar'));

    expect(screen.getByText('Integrações do Formulário')).toBeDefined();
    expect(screen.getByText('Webhook (Disparo de Dados)')).toBeDefined();

    const input = screen.getByPlaceholderText('https://sua-plataforma.com/webhook/endpoint');
    fireEvent.change(input, { target: { value: 'https://webhook.site/teste-123' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar URL/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/forms/1'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('https://webhook.site/teste-123')
        })
      );
    });
  });

  it('navigates to Compartilhar tab, displays public link and triggers copy', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue()
      }
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'Formulário Compartilhar',
        slug: 'link-compartilhar-123',
        status: 'PUBLICADO',
        questions: []
      })
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Formulário Compartilhar')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('tab-compartilhar'));

    expect(screen.getByText('Compartilhar Formulário')).toBeDefined();
    expect(screen.getByText('Link Público do Formulário')).toBeDefined();

    const urlInput = screen.getByTestId('share-url-input');
    expect(urlInput.value).toContain('/form/link-compartilhar-123');

    const copyBtn = screen.getByTestId('copy-share-btn');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/form/link-compartilhar-123')
    );
  });

  it('navigates to Integrar tab and connects/disconnects Google Calendar', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Integrações Teste',
          slug: 'integracoes-teste',
          status: 'PUBLICADO',
          webhook_url: '',
          google_calendar_connected: false,
          google_calendar_email: '',
          questions: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Integrações Teste',
          slug: 'integracoes-teste',
          status: 'PUBLICADO',
          webhook_url: '',
          google_calendar_connected: true,
          google_calendar_email: 'contato@empresa.com',
          questions: []
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Formulário Integrações Teste')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('tab-integrar'));

    expect(screen.getByText('Google Agenda (Google Calendar)')).toBeDefined();

    const oauthBtn = screen.getByTestId('connect-google-oauth-btn');
    expect(oauthBtn).toBeDefined();
    fireEvent.click(oauthBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/integrations/google-calendar/auth-url'),
        expect.anything()
      );
    });
  });

  it('navigates to Resultados tab and displays paginated responses list', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('/responses')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              {
                id: 101,
                contact_name: 'Ana Maria Braga',
                contact_email: 'anamaria@globo.com',
                contact_phone: '+55 11 98888-7777',
                created_at: '2026-10-16T18:00:00-03:00',
                answers: [
                  { question_title: 'Qual é o seu nome completo?', answer: 'Ana Maria Braga' }
                ]
              }
            ],
            total: 1,
            page: 1,
            limit: 20,
            total_pages: 1
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário com Resultados',
          slug: 'form-com-resultados',
          status: 'PUBLICADO',
          questions: []
        })
      });
    });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Formulário com Resultados')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('tab-resultados'));

    await waitFor(() => {
      expect(screen.getByText('Resultados do Formulário')).toBeDefined();
      expect(screen.getAllByText('Ana Maria Braga').length).toBeGreaterThan(0);
      expect(screen.getByText('Página 1 de 1')).toBeDefined();
      expect(screen.getByText(/Mostrando/i)).toBeDefined();
    });
  });

  it('adds ending screen and configures redirect button text and url', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário com Tela Final',
          slug: 'form-tela-final',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Nome?' }
          ],
          ending_screens: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário com Tela Final',
          slug: 'form-tela-final',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Nome?' }
          ],
          ending_screens: [
            {
              id: 'end_123',
              title: 'Recebemos sua aplicação',
              description: 'Obrigado por responder.',
              button_text: 'Acessar nosso site',
              button_url: 'https://seusite.com'
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
      expect(screen.getByText('Formulário com Tela Final')).toBeDefined();
    });

    const addEndingBtn = screen.getByTestId('add-ending-screen-btn');
    fireEvent.click(addEndingBtn);

    await waitFor(() => {
      expect(screen.getByTestId('ending-screen-preview-box')).toBeDefined();
      expect(screen.getByTestId('ending-screen-title-input')).toBeDefined();
      expect(screen.getByTestId('ending-button-text-input')).toBeDefined();
      expect(screen.getByTestId('ending-button-url-input')).toBeDefined();
    });
  });

  it('opens confirmation popup before deleting an ending screen and allows canceling', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário Teste Delete Ending',
          slug: 'form-delete-end',
          status: 'PUBLICADO',
          questions: [
            { id: 'q1', type: 'short_text', title: 'Questão Única' }
          ],
          ending_screens: [
            { id: 'end1', title: 'Tela Final 1', button_text: 'Site', button_url: 'https://' }
          ]
        })
      });

    render(
      <ToastProvider>
        <FormEditor formId={1} onBack={() => {}} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tela Final 1')).toBeDefined();
    });

    const deleteEndingBtn = screen.getByTestId('delete-ending-btn-0');
    fireEvent.click(deleteEndingBtn);

    expect(screen.getByTestId('confirm-delete-modal-content')).toBeDefined();
    expect(screen.getByText('Excluir Tela Final')).toBeDefined();

    const cancelBtn = screen.getByTestId('cancel-delete-btn');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('confirm-delete-modal-content')).toBeNull();
    expect(screen.getByText('Tela Final 1')).toBeDefined();
  });

  it('allows activating welcome screen and configuring its title and button text in editor', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário com Boas-Vindas',
          slug: 'form-welcome',
          status: 'PUBLICADO',
          welcome_screen: {
            enabled: false
          },
          questions: [
            {
              id: 'q1',
              type: 'short_text',
              title: 'Primeira Pergunta',
              required: false
            }
          ],
          ending_screens: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          title: 'Formulário com Boas-Vindas',
          slug: 'form-welcome',
          status: 'PUBLICADO',
          welcome_screen: {
            enabled: true,
            title: 'Boas-vindas ao Formulário',
            description: 'Preencha este formulário.',
            button_text: 'COMEÇAR FORMULÁRIO'
          },
          questions: [
            { id: 'q1', type: 'short_text', title: 'Primeira Pergunta', required: false }
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
      expect(screen.getByText('TELA DE BOAS VINDAS')).toBeDefined();
    });

    const addWelcomeBtn = screen.getByTestId('add-welcome-screen-btn');
    fireEvent.click(addWelcomeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen-preview-box')).toBeDefined();
      expect(screen.getByTestId('welcome-config-group')).toBeDefined();
      expect(screen.getByTestId('welcome-button-text-input')).toBeDefined();
    });
  });
});
