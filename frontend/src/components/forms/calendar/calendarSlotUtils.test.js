import { describe, it, expect } from 'vitest';
import { groupSlotsByInterval } from './calendarSlotUtils';

describe('calendarSlotUtils - groupSlotsByInterval', () => {
  it('returns empty array when slots is empty or invalid', () => {
    expect(groupSlotsByInterval([])).toEqual([]);
    expect(groupSlotsByInterval(null)).toEqual([]);
    expect(groupSlotsByInterval(undefined)).toEqual([]);
  });

  it('keeps continuous slots in a single group', () => {
    const slots = [
      { time: '09:00', start_iso: '2026-10-22T09:00:00' },
      { time: '10:00', start_iso: '2026-10-22T10:00:00' },
      { time: '11:00', start_iso: '2026-10-22T11:00:00' }
    ];
    const groups = groupSlotsByInterval(slots, 60, 0);
    expect(groups.length).toBe(1);
    expect(groups[0].map((s) => s.time)).toEqual(['09:00', '10:00', '11:00']);
  });

  it('separates slots with intervals (e.g. lunch break) into distinct groups', () => {
    const slots = [
      { time: '09:00', start_iso: '2026-10-22T09:00:00' },
      { time: '10:00', start_iso: '2026-10-22T10:00:00' },
      { time: '11:00', start_iso: '2026-10-22T11:00:00' },
      // Intervalo entre 12:00 e 14:00
      { time: '14:00', start_iso: '2026-10-22T14:00:00' },
      { time: '15:00', start_iso: '2026-10-22T15:00:00' },
      { time: '16:00', start_iso: '2026-10-22T16:00:00' }
    ];
    const groups = groupSlotsByInterval(slots, 60, 0);
    expect(groups.length).toBe(2);
    expect(groups[0].map((s) => s.time)).toEqual(['09:00', '10:00', '11:00']);
    expect(groups[1].map((s) => s.time)).toEqual(['14:00', '15:00', '16:00']);
  });

  it('separates slots based on range_idx when multiple turnos are configured', () => {
    const slots = [
      { time: '09:00', range_idx: 0 },
      { time: '10:00', range_idx: 0 },
      { time: '14:00', range_idx: 1 },
      { time: '15:00', range_idx: 1 },
      { time: '19:00', range_idx: 2 },
      { time: '20:00', range_idx: 2 }
    ];
    const groups = groupSlotsByInterval(slots, 60, 0);
    expect(groups.length).toBe(3);
    expect(groups[0].map((s) => s.time)).toEqual(['09:00', '10:00']);
    expect(groups[1].map((s) => s.time)).toEqual(['14:00', '15:00']);
    expect(groups[2].map((s) => s.time)).toEqual(['19:00', '20:00']);
  });

  it('accounts for buffer minutes when detecting continuous slots', () => {
    const slots = [
      { time: '09:00' },
      { time: '09:45' }, // 30 min duration + 15 min buffer = 45 min
      { time: '11:00' }  // gap from 10:30 to 11:00 (interval)
    ];
    const groups = groupSlotsByInterval(slots, 30, 15);
    expect(groups.length).toBe(2);
    expect(groups[0].map((s) => s.time)).toEqual(['09:00', '09:45']);
    expect(groups[1].map((s) => s.time)).toEqual(['11:00']);
  });
});
