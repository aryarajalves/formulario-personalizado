/**
 * Utilitários de formatação para exibição de respostas de formulários
 */

/**
 * Formata um valor de resposta para exibição amigável na interface e relatórios.
 * Converte datas/horários ISO (como os gerados pelo Google Agenda: 2026-10-23T13:00:00-03:00)
 * para o formato solicitado pelo usuário: dd/MM/yy HH:mm (ex: 23/10/26 13:00).
 *
 * @param {any} val - Valor bruto da resposta
 * @returns {string} - Valor formatado para visualização
 */
export function formatAnswerValue(val) {
  if (val === null || val === undefined || val === '') {
    return '—';
  }

  // Se for array (ex: múltiplas escolhas)
  if (Array.isArray(val)) {
    return val.map((v) => formatAnswerValue(v)).join(', ');
  }

  // Se for booleano
  if (typeof val === 'boolean') {
    return val ? 'Sim' : 'Não';
  }

  const strVal = String(val).trim();
  if (!strVal) {
    return '—';
  }

  // Verifica se é uma data/hora no formato ISO (ex: 2026-10-23T13:00:00-03:00 ou 2026-10-23T13:00:00Z)
  // Formato: YYYY-MM-DDTHH:mm(:ss)?(timezone)?
  const isoDateTimeRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?$/i;
  const dtMatch = strVal.match(isoDateTimeRegex);
  if (dtMatch) {
    const fullYear = dtMatch[1];
    const shortYear = fullYear.slice(-2); // 'yy' (2 dígitos)
    const month = dtMatch[2]; // 'MM'
    const day = dtMatch[3]; // 'dd'
    const hours = dtMatch[4]; // 'HH'
    const minutes = dtMatch[5]; // 'mm'
    return `${day}/${month}/${shortYear} ${hours}:${minutes}`;
  }

  // Se for apenas data no formato YYYY-MM-DD (sem horário)
  const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateMatch = strVal.match(isoDateRegex);
  if (dateMatch) {
    const shortYear = dateMatch[1].slice(-2);
    const month = dateMatch[2];
    const day = dateMatch[3];
    return `${day}/${month}/${shortYear}`;
  }

  return strVal;
}
