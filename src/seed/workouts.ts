import type { WorkoutTemplate } from '@/db/types';

/**
 * Treinos ABC para iniciante com foco em hipertrofia (edite à vontade).
 * Faixas 6–12 reps nos compostos, 8–15 nos acessórios; descanso 60–120 s.
 * Cada treino foi calibrado para ~45 min (cabe na janela 07:10–08:00).
 */
export const WORKOUTS: WorkoutTemplate[] = [
  {
    id: 'A',
    name: 'Treino A',
    focus: 'Peito · Ombros · Tríceps',
    warmup: '5 min: 2 min de polichinelo ou bike leve + rotação de ombros + 1 série leve (12 reps) do supino com metade da carga.',
    cooldown: '5 min: alongar peito na parede, ombro cruzado e tríceps acima da cabeça (30 s cada lado).',
    exercises: [
      { exerciseId: 'supino-halteres', sets: 3, repMin: 6, repMax: 10, restSec: 120, note: 'Exercício principal: priorize a progressão de carga aqui.' },
      { exerciseId: 'supino-inclinado-halteres', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
      { exerciseId: 'desenvolvimento-halteres', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
      { exerciseId: 'elevacao-lateral', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
      { exerciseId: 'triceps-polia', sets: 3, repMin: 10, repMax: 12, restSec: 60 },
    ],
  },
  {
    id: 'B',
    name: 'Treino B',
    focus: 'Costas · Bíceps · Core',
    warmup: '5 min: 2 min de remo/bike leve + rotação de ombros + 1 série leve (12 reps) da puxada.',
    cooldown: '5 min: pendurar na barra (20 s), alongar dorsal e bíceps (30 s cada lado).',
    exercises: [
      { exerciseId: 'puxada-frente', sets: 3, repMin: 8, repMax: 12, restSec: 90, note: 'Exercício principal: priorize a progressão de carga aqui.' },
      { exerciseId: 'remada-unilateral', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
      { exerciseId: 'remada-baixa', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
      { exerciseId: 'rosca-halteres', sets: 3, repMin: 8, repMax: 12, restSec: 60 },
      { exerciseId: 'prancha', sets: 2, repMin: 30, repMax: 45, restSec: 45, note: 'Em segundos.' },
    ],
  },
  {
    id: 'C',
    name: 'Treino C',
    focus: 'Pernas · Glúteos · Panturrilha · Abdômen',
    warmup: '5 min: 2 min de bike leve + agachamento livre sem peso (15) + 1 série leve do leg press.',
    cooldown: '5 min: alongar quadríceps, posteriores, glúteos e panturrilha (30 s cada).',
    exercises: [
      { exerciseId: 'leg-press', sets: 3, repMin: 8, repMax: 12, restSec: 120, note: 'Exercício principal: priorize a progressão de carga aqui.' },
      { exerciseId: 'stiff-halteres', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
      { exerciseId: 'afundo-halteres', sets: 2, repMin: 10, repMax: 12, restSec: 75, note: 'Reps por perna.' },
      { exerciseId: 'flexora', sets: 2, repMin: 10, repMax: 12, restSec: 60 },
      { exerciseId: 'panturrilha-pe', sets: 3, repMin: 12, repMax: 15, restSec: 60 },
      { exerciseId: 'abdominal', sets: 2, repMin: 12, repMax: 15, restSec: 45 },
    ],
  },
];
