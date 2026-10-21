import { describe, it, expect } from 'vitest';
import { formatAnswerValue } from './formatUtils';

describe('formatAnswerValue utility', () => {
  it('formats Google Calendar ISO datetime to dd/MM/yy HH:mm correctly', () => {
    // Caso exato enviado pelo usuário no screenshot: 2026-10-23T13:00:00-03:00
    expect(formatAnswerValue('2026-10-23T13:00:00-03:00')).toBe('23/10/26 13:00');
    expect(formatAnswerValue('2026-10-21T09:30:00-03:00')).toBe('21/10/26 09:30');
    expect(formatAnswerValue('2026-05-04T15:45:00Z')).toBe('04/05/26 15:45');
    expect(formatAnswerValue('2026-12-31T20:00:00')).toBe('31/12/26 20:00');
    expect(formatAnswerValue('2026-01-05T08:00')).toBe('05/01/26 08:00');
  });

  it('formats pure date (YYYY-MM-DD) to dd/MM/yy', () => {
    expect(formatAnswerValue('2026-10-23')).toBe('23/10/26');
    expect(formatAnswerValue('2026-01-09')).toBe('09/01/26');
  });

  it('preserves regular non-date text intact', () => {
    expect(formatAnswerValue('Aryaraj Alves Fernandes')).toBe('Aryaraj Alves Fernandes');
    expect(formatAnswerValue('+55 85988146141')).toBe('+55 85988146141');
    expect(formatAnswerValue('Sim')).toBe('Sim');
  });

  it('handles null, undefined and empty values gracefully', () => {
    expect(formatAnswerValue(null)).toBe('—');
    expect(formatAnswerValue(undefined)).toBe('—');
    expect(formatAnswerValue('')).toBe('—');
    expect(formatAnswerValue('   ')).toBe('—');
  });

  it('formats boolean and array values', () => {
    expect(formatAnswerValue(true)).toBe('Sim');
    expect(formatAnswerValue(false)).toBe('Não');
    expect(formatAnswerValue(['Opção 1', 'Opção 2'])).toBe('Opção 1, Opção 2');
    expect(formatAnswerValue(['2026-10-23T13:00:00-03:00', '2026-10-24T15:00:00-03:00']))
      .toBe('23/10/26 13:00, 24/10/26 15:00');
  });
});
