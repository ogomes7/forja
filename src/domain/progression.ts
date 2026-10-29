import type { WorkoutExercise } from '@/db/types';

export interface SetResult {
  weight: number;
  reps: number;
}

/** 1RM estimado (Epley). */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface Suggestion {
  action: 'start' | 'increase' | 'keep' | 'decrease';
  weight: number;
  reps: number;
  message: string;
}

/**
 * Dupla progressão: sobe as repetições dentro da faixa; quando todas as séries
 * batem o topo da faixa, sobe a carga e volta para o início da faixa.
 */
export function suggestNext(last: SetResult[], plan: Pick<WorkoutExercise, 'repMin' | 'repMax' | 'sets'>, increment: number): Suggestion {
  const work = last.filter((s) => s.reps > 0);
  if (!work.length) {
    return { action: 'start', weight: 0, reps: plan.repMin, message: `Escolha uma carga que permita ${plan.repMin}–${plan.repMax} reps com boa técnica, parando 1–2 reps antes da falha.` };
  }
  const weight = Math.max(...work.map((s) => s.weight));
  const top = work.filter((s) => s.weight === weight);
  const allTop = top.length >= plan.sets && top.every((s) => s.reps >= plan.repMax);
  if (allTop) {
    const next = round(weight + increment);
    return { action: 'increase', weight: next, reps: plan.repMin, message: `Bateu ${plan.repMax} reps em todas as séries. Suba para ${fmt(next)} kg e volte para ${plan.repMin} reps.` };
  }
  if (top.every((s) => s.reps < plan.repMin)) {
    const next = Math.max(0, round(weight - increment));
    return { action: 'decrease', weight: next, reps: plan.repMin, message: `Ficou abaixo de ${plan.repMin} reps. Reduza para ${fmt(next)} kg e foque na técnica.` };
  }
  const best = Math.min(plan.repMax, Math.max(...top.map((s) => s.reps)) + 1);
  return { action: 'keep', weight, reps: best, message: `Mantenha ${fmt(weight)} kg e tente ${best} reps em cada série.` };
}

export interface PrRecord {
  maxWeight: number;
  best1RM: number;
  /** Maior volume de uma série (kg × reps). */
  bestSetVolume: number;
}

export function computeRecord(sets: SetResult[]): PrRecord {
  return sets.reduce<PrRecord>(
    (r, s) => ({
      maxWeight: Math.max(r.maxWeight, s.weight),
      best1RM: Math.max(r.best1RM, epley1RM(s.weight, s.reps)),
      bestSetVolume: Math.max(r.bestSetVolume, s.weight * s.reps),
    }),
    { maxWeight: 0, best1RM: 0, bestSetVolume: 0 },
  );
}

/** Lista quais recordes a série nova bate em relação ao histórico. */
export function detectPRs(prev: PrRecord, set: SetResult): ('carga' | '1rm' | 'volume')[] {
  if (set.weight <= 0 || set.reps <= 0) return [];
  const out: ('carga' | '1rm' | 'volume')[] = [];
  if (prev.maxWeight > 0 && set.weight > prev.maxWeight) out.push('carga');
  if (prev.best1RM > 0 && epley1RM(set.weight, set.reps) > prev.best1RM + 0.01) out.push('1rm');
  if (prev.bestSetVolume > 0 && set.weight * set.reps > prev.bestSetVolume) out.push('volume');
  return out;
}

export function volume(sets: SetResult[]): number {
  return sets.reduce((s, x) => s + x.weight * x.reps, 0);
}

/** Sugere deload depois de 7 semanas (6–8) de treino desde o início ou do último deload. */
export const DELOAD_EVERY_WEEKS = 7;
export function deloadDue(weeksSinceLast: number): boolean {
  return weeksSinceLast >= DELOAD_EVERY_WEEKS;
}

/** Na semana de deload: ~60% das séries (mín. 1) e 90% da carga. */
export function deloadAdjust(sets: number, weight: number) {
  return { sets: Math.max(1, Math.round(sets * 0.6)), weight: round(weight * 0.9) };
}

function round(n: number) {
  return Math.round(n * 4) / 4;
}

export function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '').replace('.', ',');
}
