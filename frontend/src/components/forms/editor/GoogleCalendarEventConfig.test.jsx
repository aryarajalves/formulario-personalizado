import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GoogleCalendarEventConfig, { GOOGLE_CALENDAR_COLORS } from './GoogleCalendarEventConfig';

describe('GoogleCalendarEventConfig Component', () => {
  it('renders all 11 Google Calendar colors with emojis and handles selection', () => {
    const handleChangeColor = vi.fn();
    const handleChangeTitle = vi.fn();
    const handleChangeDesc = vi.fn();

    render(
      <GoogleCalendarEventConfig
        eventTitle="Reunião com {nome}"
        onChangeEventTitle={handleChangeTitle}
        eventDescription="Detalhes da reunião"
        onChangeEventDescription={handleChangeDesc}
        eventColorId="2"
        onChangeEventColorId={handleChangeColor}
      />
    );

    // Deve exibir as 11 opções de cores
    expect(GOOGLE_CALENDAR_COLORS.length).toBe(11);
    const swatches = screen.getAllByRole('radio');
    expect(swatches.length).toBe(11);

    // Cor 2 (Sálvia - Verde) deve estar selecionada
    const salviaBtn = screen.getByTestId('color-swatch-2');
    expect(salviaBtn).toHaveClass('active');
    expect(salviaBtn).toHaveAttribute('aria-checked', 'true');

    // Ao clicar na cor 7 (Pavão - Azul), chama onChangeEventColorId
    const pavaoBtn = screen.getByTestId('color-swatch-7');
    fireEvent.click(pavaoBtn);
    expect(handleChangeColor).toHaveBeenCalledWith('7');
  });

  it('renders preview with corresponding color emoji and title', () => {
    render(
      <GoogleCalendarEventConfig
        eventTitle="Reunião de Diagnóstico"
        onChangeEventTitle={vi.fn()}
        eventDescription="Desc"
        onChangeEventDescription={vi.fn()}
        eventColorId="2"
        onChangeEventColorId={vi.fn()}
      />
    );

    const preview = screen.getByTestId('event-mini-preview');
    expect(preview).toBeInTheDocument();
    // Cor 2 é Sálvia com emoji 🟢
    expect(preview.textContent).toContain('🟢 Reunião de Diagnóstico');
    expect(preview.textContent).toContain('Cor: Sálvia (🟢)');
  });

  it('allows clicking tag chips to insert into title and description', () => {
    const handleChangeTitle = vi.fn();
    const handleChangeDesc = vi.fn();

    render(
      <GoogleCalendarEventConfig
        eventTitle="Reunião"
        onChangeEventTitle={handleChangeTitle}
        eventDescription="Respostas:"
        onChangeEventDescription={handleChangeDesc}
        eventColorId="2"
        onChangeEventColorId={vi.fn()}
      />
    );

    const tagNome = screen.getByTestId('tag-nome-title');
    fireEvent.click(tagNome);
    expect(handleChangeTitle).toHaveBeenCalled();

    const tagEmail = screen.getByTestId('tag-email-desc');
    fireEvent.click(tagEmail);
    expect(handleChangeDesc).toHaveBeenCalled();
  });
});
