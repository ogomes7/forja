import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, planDay, workoutForDate } from './planner';
import { bmr, classifyGainPace, computeTargets, itemMacros, movingAverage, weeklySlope } from './nutrition';
import { computeRecord, deloadAdjust, deloadDue, detectPRs, epley1RM, suggestNext } from './progression';
import { estimateWorkoutMin } from './workoutTime';
import { analyzeCheckin } from './checkin';
import { addDays, diffForward, toHhmm, toMin, weekStart } from './time';
import { WORKOUTS } from '@/seed/workouts';
import { EXERCISES } from '@/seed/exercises';
import type { BodyMetric } from '@/db/types';

describe('time', () => {
  it('converte e normaliza horários', () => {
    expect(toMin('07:10')).toBe(430);
    expect(toHhmm(-120)).toBe('22:00');
    expect(toHhmm(1500)).toBe('01:00');
    expect(diffForward('23:30', '00:15')).toBe(45);
  });
  it('semana começa na segunda', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // domingo
    expect(weekStart('2026-10-29')).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('planejador reverso', () => {
  const p = planDay(DEFAULT_SCHEDULE);
  it('saída 07:00 com 7h30 de sono → acordar 05:30, dormir 22:00', () => {
    expect(p.wake).toBe('05:30');
    expect(p.bedtime).toBe('22:00');
    expect(p.hydrate).toBe('05:30');
  });
  it('pré-treino 60–75 min antes de sair e lanche rápido 30 min antes', () => {
    expect(p.preWorkout).toEqual({ from: '05:45', to: '06:00' });
    expect(p.quickSnack).toBe('06:30');
  });
  it('janela 07:10–08:00 = 50 min, 40 de treino', () => {
    expect(p.gymArrival).toBe('07:10');
    expect(p.windowMin).toBe(50);
    expect(p.trainingMin).toBe(40);
    expect(p.warnings).toEqual([]);
  });
  it('pós-treino ~08:20 e 6 refeições em ordem crescente', () => {
    expect(p.postWorkout).toBe('08:20');
    expect(p.meals.map((m) => m.slot)).toEqual(['pre', 'pos', 'almoco', 'lanche', 'jantar', 'ceia']);
    const times = p.meals.map((m) => toMin(m.time));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(p.meals.at(-1)!.time).toBe('21:15');
  });
  it('recalcula quando a saída muda', () => {
    const q = planDay({ ...DEFAULT_SCHEDULE, departure: '06:30' });
    expect(q.wake).toBe('05:00');
    expect(q.bedtime).toBe('21:30');
    expect(q.windowMin).toBe(80);
  });
  it('avisa quando a preparação é curta e quando o sono é curto', () => {
    const q = planDay({ ...DEFAULT_SCHEDULE, prepMin: 40, sleepHours: 6 });
    expect(q.warnings.length).toBe(2);
    expect(toMin(q.preWorkout.from)).toBeGreaterThanOrEqual(toMin(q.wake));
  });
  it('5 refeições: sem ceia, jantar 2 h antes de dormir', () => {
    const q = planDay({ ...DEFAULT_SCHEDULE, mealsPerDay: 5 });
    expect(q.meals.map((m) => m.slot)).toEqual(['pre', 'pos', 'almoco', 'lanche', 'jantar']);
    expect(q.meals.at(-1)!.time).toBe('20:00');
  });
  it('ciclo ABC só avança nos dias de treino', () => {
    // 2026-10-26 é segunda. Seg/Qua/Sex.
    const days = [1, 3, 5];
    expect(workoutForDate('2026-10-26', '2026-10-26', days)).toBe('A');
    expect(workoutForDate('2026-10-27', '2026-10-26', days)).toBeNull();
    expect(workoutForDate('2026-10-28', '2026-10-26', days)).toBe('B');
    expect(workoutForDate('2026-10-30', '2026-10-26', days)).toBe('C');
    expect(workoutForDate('2026-11-02', '2026-10-26', days)).toBe('A');
  });
});

describe('nutrição', () => {
  it('TMB Mifflin-St Jeor', () => {
    expect(bmr('M', 70, 175, 25)).toBeCloseTo(1673.75);
    expect(bmr('F', 60, 165, 30)).toBeCloseTo(1320.25);
  });
  it('metas de ganho de massa: superávit e macros', () => {
    const t = computeTargets({ sex: 'M', weightKg: 70, heightCm: 175, age: 25, activity: 'moderate', surplusKcal: 400, proteinPerKg: 2, fatPerKg: 0.9 });
    expect(t.tdee).toBe(2594);
    expect(t.kcal).toBe(2990);
    expect(t.protein).toBe(140);
    expect(t.fat).toBe(63);
    expect(t.carbs).toBe(Math.round((2990 - 140 * 4 - 63 * 9) / 4));
  });
  it('macros proporcionais à porção', () => {
    const arroz = { id: 'a', name: 'Arroz', group: 'carboidrato' as const, unit: 'g' as const, portion: 100, kcal: 128, protein: 2.5, carbs: 28, fat: 0.2 };
    expect(itemMacros({ foodId: 'a', qty: 150 }, arroz).kcal).toBeCloseTo(192);
  });
  it('classifica ritmo de ganho', () => {
    expect(classifyGainPace(0)).toBe('parado');
    expect(classifyGainPace(0.3)).toBe('ideal');
    expect(classifyGainPace(0.8)).toBe('muito_rapido');
  });
  it('inclinação semanal e média móvel', () => {
    const pts = [0, 7, 14].map((d, i) => ({ day: d, weight: 70 + i * 0.4 }));
    expect(weeklySlope(pts)).toBeCloseTo(0.4);
    expect(movingAverage([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
  });
});

describe('progressão de carga', () => {
  const plan = { sets: 3, repMin: 8, repMax: 12 };
  it('sem histórico pede carga inicial', () => {
    expect(suggestNext([], plan, 2).action).toBe('start');
  });
  it('topo da faixa em todas as séries → sobe carga', () => {
    const s = suggestNext([{ weight: 20, reps: 12 }, { weight: 20, reps: 12 }, { weight: 20, reps: 12 }], plan, 2);
    expect(s).toMatchObject({ action: 'increase', weight: 22, reps: 8 });
  });
  it('dentro da faixa → mantém e busca +1 rep', () => {
    const s = suggestNext([{ weight: 20, reps: 10 }, { weight: 20, reps: 9 }, { weight: 20, reps: 8 }], plan, 2);
    expect(s).toMatchObject({ action: 'keep', weight: 20, reps: 11 });
  });
  it('abaixo da faixa → reduz', () => {
    const s = suggestNext([{ weight: 30, reps: 6 }, { weight: 30, reps: 5 }, { weight: 30, reps: 5 }], plan, 2);
    expect(s).toMatchObject({ action: 'decrease', weight: 28 });
  });
  it('1RM (Epley) e recordes', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(60, 10)).toBeCloseTo(80);
    const rec = computeRecord([{ weight: 20, reps: 10 }]);
    expect(detectPRs(rec, { weight: 22, reps: 6 })).toEqual(['carga']);
    expect(detectPRs(rec, { weight: 20, reps: 12 })).toEqual(['1rm', 'volume']);
    expect(detectPRs(computeRecord([]), { weight: 20, reps: 10 })).toEqual([]);
  });
  it('deload a cada ~7 semanas', () => {
    expect(deloadDue(6)).toBe(false);
    expect(deloadDue(7)).toBe(true);
    expect(deloadAdjust(3, 20)).toEqual({ sets: 2, weight: 18 });
  });
});

describe('treinos seed cabem na janela', () => {
  const ex = new Map(EXERCISES.map((e) => [e.id, e]));
  for (const w of WORKOUTS) {
    it(`treino ${w.id} ≤ 50 min e todos os exercícios existem`, () => {
      for (const we of w.exercises) expect(ex.has(we.exerciseId), we.exerciseId).toBe(true);
      expect(estimateWorkoutMin(w.exercises, ex)).toBeLessThanOrEqual(50);
    });
  }
  it('alternativas apontam para exercícios existentes', () => {
    for (const e of EXERCISES) for (const a of e.alternatives) expect(ex.has(a), `${e.id} → ${a}`).toBe(true);
  });
});

describe('check-in semanal', () => {
  const today = '2026-10-29';
  const mk = (daysAgo: number, weight: number, extra: Partial<BodyMetric> = {}): BodyMetric => ({ id: String(daysAgo), date: addDays(today, -daysAgo), weight, ...extra });
  it('peso parado → +kcal', () => {
    const r = analyzeCheckin([mk(20, 70), mk(14, 70.1), mk(7, 69.9), mk(0, 70)], today);
    expect(r.kcalDelta).toBe(200);
  });
  it('ganho rápido demais → -kcal', () => {
    const r = analyzeCheckin([mk(14, 70), mk(7, 71), mk(0, 72)], today);
    expect(r.kcalDelta).toBe(-150);
  });
  it('cintura subindo mais que braços → alerta', () => {
    const r = analyzeCheckin([mk(14, 70, { waist: 80, armR: 32 }), mk(7, 70.4), mk(0, 70.8, { waist: 82, armR: 32.2 })], today);
    expect(r.suggestions.some((s) => s.includes('Cintura'))).toBe(true);
  });
  it('poucos dados → pede mais pesagens', () => {
    expect(analyzeCheckin([mk(0, 70)], today).pace).toBeNull();
  });
});
