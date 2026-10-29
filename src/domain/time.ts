import type { Hhmm, IsoDate } from '@/db/types';

const DAY = 24 * 60;

/** "07:30" → 450 */
export function toMin(h: Hhmm): number {
  const [hh, mm] = h.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

/** 450 → "07:30" (normaliza para 0..1439). */
export function toHhmm(min: number): Hhmm {
  const m = ((Math.round(min) % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function addMin(h: Hhmm, delta: number): Hhmm {
  return toHhmm(toMin(h) + delta);
}

/** Arredonda para o múltiplo de `step` minutos mais próximo. */
export function roundTo(min: number, step = 5): number {
  return Math.round(min / step) * step;
}

/** Diferença em minutos de a até b, assumindo que b vem depois (atravessa a meia-noite se preciso). */
export function diffForward(a: Hhmm, b: Hhmm): number {
  return (((toMin(b) - toMin(a)) % DAY) + DAY) % DAY;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Data local no formato ISO (sem fuso). */
export function isoDate(d = new Date()): IsoDate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIso(s: IsoDate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: IsoDate, n: number): IsoDate {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);
}

/** Segunda-feira da semana da data. */
export function weekStart(s: IsoDate): IsoDate {
  const wd = parseIso(s).getDay();
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
/** Ordem de exibição Seg → Dom. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function formatDateBR(s: IsoDate, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) {
  return parseIso(s).toLocaleDateString('pt-BR', opts).replace('.', '');
}
