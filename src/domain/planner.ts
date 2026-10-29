import type { Hhmm, MealSlot, Schedule } from '@/db/types';
import { addMin, diffForward, roundTo, toHhmm, toMin } from './time';

/**
 * Planejador reverso: a partir da hora de saída, calcula o dia inteiro.
 * Funções puras — sem acesso a banco ou relógio.
 */

export type PlanInput = Pick<Schedule, 'departure' | 'commuteMin' | 'gymDeadline' | 'sleepHours' | 'prepMin' | 'postDelayMin' | 'mealsPerDay'>;

export interface PlannedMeal {
  slot: MealSlot;
  name: string;
  time: Hhmm;
  hint: string;
}

export interface DayPlan {
  bedtime: Hhmm;
  wake: Hhmm;
  hydrate: Hhmm;
  preWorkout: { from: Hhmm; to: Hhmm };
  /** Lanche rápido para quando acordar em cima da hora. */
  quickSnack: Hhmm;
  departure: Hhmm;
  gymArrival: Hhmm;
  gymDeadline: Hhmm;
  /** Minutos totais na academia (chegada → limite). */
  windowMin: number;
  /** Minutos para os exercícios (janela − aquecimento − volta à calma). */
  trainingMin: number;
  postWorkout: Hhmm;
  meals: PlannedMeal[];
  warnings: string[];
}

export const DEFAULT_SCHEDULE: Omit<Schedule, 'id'> = {
  departure: '07:00',
  commuteMin: 10,
  gymDeadline: '08:00',
  sleepHours: 7.5,
  prepMin: 90,
  postDelayMin: 20,
  mealsPerDay: 6,
  trainingDays: [1, 3, 5],
};

export const WARMUP_MIN = 5;
export const COOLDOWN_MIN = 5;

/** Pré-treino: entre 75 e 60 min antes de sair. */
const PRE_FROM = 75;
const PRE_TO = 60;
const QUICK_SNACK = 30;
/** Ceia: 45 min antes de dormir. */
const SUPPER_BEFORE_BED = 45;
/** Sem ceia, o jantar fica 2 h antes de dormir. */
const DINNER_BEFORE_BED = 120;

export function planDay(input: PlanInput): DayPlan {
  const warnings: string[] = [];
  const dep = toMin(input.departure);
  const wake = dep - input.prepMin;
  const bedtime = wake - Math.round(input.sleepHours * 60);

  let preFrom = dep - PRE_FROM;
  let preTo = dep - PRE_TO;
  if (preFrom < wake + 10) {
    preFrom = wake + 10;
    preTo = Math.max(preTo, preFrom + 10);
    if (preTo > dep - 30) warnings.push('Pouco tempo entre acordar e sair: prefira o lanche rápido (banana, mel ou torrada) 30 min antes de sair.');
  }

  const gymArrival = dep + input.commuteMin;
  const windowMin = diffForward(toHhmm(gymArrival), input.gymDeadline);
  const trainingMin = Math.max(0, windowMin - WARMUP_MIN - COOLDOWN_MIN);
  if (windowMin < 35) warnings.push(`Janela de treino curta (${windowMin} min). Treinos ficarão reduzidos.`);

  const post = toMin(input.gymDeadline) + input.postDelayMin;

  const meals: PlannedMeal[] = [
    { slot: 'pre', name: 'Pré-treino', time: toHhmm(roundTo(preFrom)), hint: 'Leve: carboidrato + pouca gordura e fibra.' },
    { slot: 'pos', name: 'Pós-treino', time: toHhmm(roundTo(post)), hint: 'Proteína + carboidrato logo ao chegar.' },
  ];

  // Distribui as refeições restantes entre o pós-treino e a última refeição do dia.
  const hasSupper = input.mealsPerDay === 6;
  const bedAbs = bedtime + 24 * 60; // dormir é no fim do dia
  const lastMeal = hasSupper ? bedAbs - SUPPER_BEFORE_BED : bedAbs - DINNER_BEFORE_BED;
  const middle: { slot: MealSlot; name: string; hint: string }[] = hasSupper
    ? [
        { slot: 'almoco', name: 'Almoço', hint: 'Prato completo: arroz, feijão, proteína, legumes e azeite.' },
        { slot: 'lanche', name: 'Lanche da tarde', hint: 'Proteína + carboidrato (ex.: sanduíche, iogurte com aveia).' },
        { slot: 'jantar', name: 'Jantar', hint: 'Igual ao almoço, ajustando as porções.' },
      ]
    : [
        { slot: 'almoco', name: 'Almoço', hint: 'Prato completo: arroz, feijão, proteína, legumes e azeite.' },
        { slot: 'lanche', name: 'Lanche da tarde', hint: 'Proteína + carboidrato (ex.: sanduíche, iogurte com aveia).' },
      ];
  const finalMeal = hasSupper
    ? { slot: 'ceia' as const, name: 'Ceia', hint: 'Proteína + carboidrato (ex.: leite com aveia, iogurte, ovos).' }
    : { slot: 'jantar' as const, name: 'Jantar', hint: 'Igual ao almoço, ajustando as porções.' };

  const span = lastMeal - post;
  const gap = span / (middle.length + 1);
  if (gap < 120) warnings.push('Refeições muito próximas (menos de 2 h). Considere 5 refeições ou dormir mais tarde.');
  middle.forEach((m, i) => meals.push({ ...m, time: toHhmm(roundTo(post + gap * (i + 1), 15)) }));
  meals.push({ ...finalMeal, time: toHhmm(roundTo(lastMeal, 15)) });

  if (input.sleepHours < 7) warnings.push('Menos de 7 h de sono atrapalha a recuperação e o ganho de massa.');

  return {
    bedtime: toHhmm(bedtime),
    wake: toHhmm(wake),
    hydrate: toHhmm(wake),
    preWorkout: { from: toHhmm(roundTo(preFrom)), to: toHhmm(roundTo(preTo)) },
    quickSnack: addMin(input.departure, -QUICK_SNACK),
    departure: input.departure,
    gymArrival: toHhmm(gymArrival),
    gymDeadline: input.gymDeadline,
    windowMin,
    trainingMin,
    postWorkout: toHhmm(roundTo(post)),
    meals,
    warnings,
  };
}

/** Qual treino do ciclo ABC cai numa data, contando só os dias de treino desde o início. */
export function workoutForDate(dateIso: string, programStart: string, trainingDays: number[], cycle: string[] = ['A', 'B', 'C']): string | null {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const target = parse(dateIso);
  if (!trainingDays.includes(target.getDay())) return null;
  const start = parse(programStart);
  if (target < start) return cycle[0];
  let count = 0;
  for (const d = new Date(start); d < target; d.setDate(d.getDate() + 1)) {
    if (trainingDays.includes(d.getDay())) count++;
  }
  return cycle[count % cycle.length];
}
