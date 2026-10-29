import type { Activity, Food, Goal, MacroTargets, MealItem, Sex } from '@/db/types';

export const ACTIVITY_FACTORS: Record<Activity, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: 'Sedentário (pouco ou nenhum exercício)' },
  light: { factor: 1.375, label: 'Leve (treino 1–3×/semana)' },
  moderate: { factor: 1.55, label: 'Moderado (treino 3–5×/semana)' },
  high: { factor: 1.725, label: 'Alto (treino 6–7×/semana)' },
  very_high: { factor: 1.9, label: 'Muito alto (trabalho físico + treino)' },
};

/** Taxa metabólica basal — Mifflin-St Jeor. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'M' ? 5 : -161);
}

export function tdee(bmrValue: number, activity: Activity): number {
  return bmrValue * ACTIVITY_FACTORS[activity].factor;
}

export const GOAL_DEFAULTS: Record<Goal, { surplusKcal: number; proteinPerKg: number; fatPerKg: number; label: string }> = {
  gain: { surplusKcal: 400, proteinPerKg: 2.0, fatPerKg: 0.9, label: 'Ganho de massa' },
  maintain: { surplusKcal: 0, proteinPerKg: 1.8, fatPerKg: 0.9, label: 'Manutenção' },
  cut: { surplusKcal: -400, proteinPerKg: 2.2, fatPerKg: 0.8, label: 'Perda de gordura' },
};

export interface TargetsInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: Activity;
  surplusKcal: number;
  proteinPerKg: number;
  fatPerKg: number;
}

/** Calorias-alvo e macros. Carboidratos ficam com o restante das calorias. */
export function computeTargets(i: TargetsInput): MacroTargets & { bmr: number; tdee: number } {
  const b = bmr(i.sex, i.weightKg, i.heightCm, i.age);
  const t = tdee(b, i.activity);
  const kcal = Math.round((t + i.surplusKcal) / 10) * 10;
  const protein = Math.round(i.weightKg * i.proteinPerKg);
  const fat = Math.round(i.weightKg * i.fatPerKg);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, bmr: Math.round(b), tdee: Math.round(t) };
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function itemMacros(item: MealItem, food: Food | undefined): Macros {
  if (!food) return ZERO;
  const f = item.qty / food.portion;
  return { kcal: food.kcal * f, protein: food.protein * f, carbs: food.carbs * f, fat: food.fat * f };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce((a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }), ZERO);
}

export function mealMacros(items: MealItem[], foods: Map<string, Food>): Macros {
  return sumMacros(items.map((i) => itemMacros(i, foods.get(i.foodId))));
}

export type GainPace = 'perdendo' | 'parado' | 'lento' | 'ideal' | 'rapido' | 'muito_rapido';

/** Classifica o ritmo semanal de ganho de peso (kg/semana) para o objetivo de ganho de massa. */
export function classifyGainPace(kgPerWeek: number): GainPace {
  if (kgPerWeek < -0.1) return 'perdendo';
  if (kgPerWeek < 0.1) return 'parado';
  if (kgPerWeek < 0.25) return 'lento';
  if (kgPerWeek <= 0.5) return 'ideal';
  if (kgPerWeek <= 0.7) return 'rapido';
  return 'muito_rapido';
}

export const PACE_LABEL: Record<GainPace, string> = {
  perdendo: 'Perdendo peso',
  parado: 'Peso parado',
  lento: 'Ganho lento',
  ideal: 'Ritmo ideal',
  rapido: 'Um pouco rápido',
  muito_rapido: 'Rápido demais',
};

/** Faixa-alvo de ganho semanal (kg) para o objetivo de ganho de massa. */
export const GAIN_RANGE = { min: 0.25, max: 0.5 };

/** Inclinação (kg/semana) por regressão linear simples sobre pares (dia, peso). */
export function weeklySlope(points: { day: number; weight: number }[]): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.day, 0) / n;
  const my = points.reduce((s, p) => s + p.weight, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.day - mx) * (p.weight - my);
    den += (p.day - mx) ** 2;
  }
  if (den === 0) return null;
  return (num / den) * 7;
}

/** Média móvel simples (janela em número de pontos). */
export function movingAverage(values: number[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    if (i + 1 < Math.min(window, 3)) return null;
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
