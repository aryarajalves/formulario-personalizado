/**
 * Utilitários para processamento e agrupamento de slots de agendamento do Google Agenda.
 */

/**
 * Agrupa os horários de atendimento identificando intervalos e turnos separados.
 * Quando há um intervalo (pausa de almoço, turno diferente ou diferença de horário superior à duração do slot),
 * os horários são divididos em grupos distintos para que a interface quebre a linha e organize visualmente.
 *
 * @param {Array} slots Lista ordenada de slots do dia ({ time, start_iso, range_idx, ... })
 * @param {number} slotDuration Duração de cada slot em minutos (ex: 60)
 * @param {number} bufferMinutes Buffer entre atendimentos em minutos (ex: 0)
 * @returns {Array<Array>} Lista de grupos de horários separados por intervalo
 */
export function groupSlotsByInterval(slots = [], slotDuration = 60, bufferMinutes = 0) {
  if (!Array.isArray(slots) || slots.length === 0) return [];

  const duration = Number(slotDuration) || 60;
  const buffer = Number(bufferMinutes) || 0;

  const groups = [];
  let currentGroup = [slots[0]];

  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1];
    const curr = slots[i];

    // 1. Verificação prioritária por range_idx (turnos/intervalos cadastrados explicitamente)
    if (
      curr.range_idx !== undefined &&
      prev.range_idx !== undefined &&
      curr.range_idx !== prev.range_idx
    ) {
      groups.push(currentGroup);
      currentGroup = [curr];
      continue;
    }

    // 2. Verificação por horário em minutos caso range_idx não esteja presente
    const [ph, pm] = (prev.time || '').split(':').map(Number);
    const [ch, cm] = (curr.time || '').split(':').map(Number);

    if (isNaN(ph) || isNaN(pm) || isNaN(ch) || isNaN(cm)) {
      currentGroup.push(curr);
      continue;
    }

    const prevStartMin = ph * 60 + pm;
    const currStartMin = ch * 60 + cm;
    const expectedNextMin = prevStartMin + duration + buffer;

    // Se o próximo slot iniciar após o término esperado (+ buffer), temos um intervalo
    if (currStartMin > expectedNextMin) {
      groups.push(currentGroup);
      currentGroup = [curr];
    } else {
      currentGroup.push(curr);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
