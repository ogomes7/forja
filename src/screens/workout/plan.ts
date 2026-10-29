import type { EquipmentId, Exercise, WorkoutExercise, WorkoutSession, WorkoutTemplate } from '@/db/types';
import { resolveExercise } from '@/db/repo';
import { deloadAdjust } from '@/domain/progression';

export interface PlannedExercise extends WorkoutExercise {
  /** Exercício efetivamente usado (após troca ou falta de equipamento). */
  ex: Exercise;
  originalId: string;
  substituted: boolean;
  missing: boolean;
}

/** Monta a lista do treino aplicando equipamentos disponíveis, trocas da sessão e deload. */
export function buildPlan(tpl: WorkoutTemplate, exercises: Map<string, Exercise>, available: EquipmentId[], session?: WorkoutSession): PlannedExercise[] {
  return tpl.exercises.map((we) => {
    const swapped = session?.swaps?.[we.exerciseId];
    const chosen = swapped ? exercises.get(swapped) : resolveExercise(we.exerciseId, exercises, available);
    const original = exercises.get(we.exerciseId)!;
    const sets = session?.deload ? deloadAdjust(we.sets, 0).sets : we.sets;
    return {
      ...we,
      sets,
      ex: chosen ?? original,
      originalId: we.exerciseId,
      substituted: !!chosen && chosen.id !== we.exerciseId,
      missing: !chosen,
    };
  });
}

/** Exercícios que trabalham o mesmo músculo principal e cabem no equipamento. */
export function swapOptions(current: Exercise, all: Exercise[], available: EquipmentId[]) {
  const ok = (e: Exercise) => e.id !== current.id && e.equipment.every((x) => available.includes(x));
  const alts = current.alternatives.map((id) => all.find((e) => e.id === id)).filter((e): e is Exercise => !!e && ok(e));
  const same = all.filter((e) => ok(e) && !alts.includes(e) && e.primary.some((m) => current.primary.includes(m)));
  return [...alts, ...same];
}

export function fmtSet(weight: number, reps: number, unit: 'reps' | 's' = 'reps') {
  const w = weight ? `${String(weight).replace('.', ',')} kg × ` : '';
  return `${w}${reps}${unit === 's' ? ' s' : ''}`;
}
