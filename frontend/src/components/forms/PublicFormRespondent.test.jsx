import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublicFormRespondent from './PublicFormRespondent';

describe('PublicFormRespondent Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then shows question', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'Formulário Teste',
        slug: 'form-teste-slug',
        questions: [
          {
            id: 'q1',
            type: 'short_text',
            title: 'Qual é o seu nome completo?',
            required: true,
            placeholder: 'Digite seu nome...'
          }
        ]
      })
    });

    render(<PublicFormRespondent slug="form-teste-slug" />);

    expect(screen.getByText('Carregando formulário...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Qual é o seu nome completo?')).toBeDefined();
    });
  });

  it('validates email format and shows error if invalid', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'Formulário Email',
        slug: 'email-slug',
        questions: [
          {
            id: 'q_email',
            type: 'email',
            title: 'Qual é o seu e-mail?',
            required: true,
            placeholder: 'nome@exemplo.com'
          }
        ]
      })
    });

    render(<PublicFormRespondent slug="email-slug" />);

    await waitFor(() => {
      expect(screen.getByText('Qual é o seu e-mail?')).toBeDefined();
    });

    const input = screen.getByTestId('standard-input');
    fireEvent.change(input, { target: { value: 'emailinvalido' } });

    const nextBtn = screen.getByRole('button', { name: /Finalizar/i });
    fireEvent.click(nextBtn);

    // Deve exibir o erro visual
    expect(screen.getByTestId('field-error-message')).toBeDefined();
    expect(screen.getByText(/insira um endereço de e-mail válido/i)).toBeDefined();
  });

  it('renders DDI selector (+55 default) and validates Brazilian phone number', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'Formulário Telefone',
        slug: 'phone-slug',
        questions: [
          {
            id: 'q_phone',
            type: 'phone',
            title: 'Qual é o seu WhatsApp?',
            required: true,
            placeholder: '(11) 98888-7777'
          }
        ]
      })
    });

    render(<PublicFormRespondent slug="phone-slug" />);

    await waitFor(() => {
      expect(screen.getByText('Qual é o seu WhatsApp?')).toBeDefined();
    });

    const ddiSelect = screen.getByTestId('ddi-select');
    expect(ddiSelect.value).toBe('+55');

    const phoneInput = screen.getByTestId('phone-input');
    fireEvent.change(phoneInput, { target: { value: '123' } });

    const nextBtn = screen.getByRole('button', { name: /Finalizar/i });
    fireEvent.click(nextBtn);

    expect(screen.getByTestId('field-error-message')).toBeDefined();
    expect(screen.getByText(/Informe um número de telefone com DDD válido/i)).toBeDefined();

    // Digita telefone válido com DDD
    fireEvent.change(phoneInput, { target: { value: '11988887777' } });
    fireEvent.click(nextBtn);

    // Agora deve submeter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submit'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('+55 11988887777')
        })
      );
    });
  });

  it('renders welcome screen first when enabled and navigates to first question on start button click', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        title: 'RETIRO CORAÇÃO CIGANO 2026',
        slug: 'retiro-2026',
        welcome_screen: {
          enabled: true,
          title: 'RETIRO CORAÇÃO CIGANO 2026',
          description: 'Três dias para sair do excesso de consciência...',
          button_text: 'QUERO VIVER O CORAÇÃO CIGANO'
        },
        questions: [
          {
            id: 'q1',
            type: 'short_text',
            title: 'Qual é o seu nome completo?',
            required: true
          }
        ]
      })
    });

    render(<PublicFormRespondent slug="retiro-2026" />);

    // Deve exibir a tela de boas-vindas com título, descrição e botão
    await waitFor(() => {
      expect(screen.getByTestId('public-welcome-screen')).toBeDefined();
      expect(screen.getByText('Três dias para sair do excesso de consciência...')).toBeDefined();
      expect(screen.getByTestId('start-form-btn')).toBeDefined();
    });

    // Clica no botão de iniciar formulário
    const startBtn = screen.getByTestId('start-form-btn');
    fireEvent.click(startBtn);

    // Deve sumir a tela de boas-vindas e exibir a primeira questão
    await waitFor(() => {
      expect(screen.queryByTestId('public-welcome-screen')).toBeNull();
      expect(screen.getByText('Qual é o seu nome completo?')).toBeDefined();
    });
  });
});
