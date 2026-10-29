import type { Exercise, WorkoutExercise } from '@/db/types';
import { COOLDOWN_MIN, WARMUP_MIN } from './planner';

/** Segundos de execução de uma série (média para 8–12 reps em cadência controlada). */
export const WORK_SEC = 45;
/** Preparar o equipamento / ajustar carga no primeiro set. */
export const SETUP_SEC = 60;
/** Troca entre exercícios. */
export const TRANSITION_SEC = 60;

export function exerciseSeconds(we: Pick<WorkoutExercise, 'sets' | 'restSec'>, perSide = false): number {
  const work = WORK_SEC * (perSide ? 2 : 1);
  return SETUP_SEC + we.sets * work + Math.max(0, we.sets - 1) * we.restSec;
}

/** Duração estimada (min) incluindo aquecimento e volta à calma. */
export function estimateWorkoutMin(list: Pick<WorkoutExercise, 'exerciseId' | 'sets' | 'restSec'>[], exercises?: Map<string, Exercise>): number {
  const body = list.reduce((s, we) => s + exerciseSeconds(we, exercises?.get(we.exerciseId)?.perSide), 0);
  const transitions = Math.max(0, list.length - 1) * TRANSITION_SEC;
  return Math.round((body + transitions) / 60) + WARMUP_MIN + COOLDOWN_MIN;
}
