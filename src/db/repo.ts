import { db } from './db';
import type {
  BodyMetric, Checkin, EquipmentId, Exercise, Food, GoalItem, IsoDate, MacroTargets, MealItem, MealLog, MealSlot, MealTemplate, Photo, PhotoPose, Profile, Schedule, SetLog, WorkoutId, WorkoutSession, WorkoutTemplate,
} from './types';
import { FOODS } from '@/seed/foods';
import { EQUIPMENT, EXERCISES } from '@/seed/exercises';
import { WORKOUTS } from '@/seed/workouts';
import { MENU_VARIANTS, variantFor } from '@/seed/menu';
import { DEFAULT_SCHEDULE, planDay } from '@/domain/planner';
import { computeTargets, mealMacros, GOAL_DEFAULTS } from '@/domain/nutrition';
import { computeRecord, detectPRs, volume } from '@/domain/progression';
import { isoDate } from '@/domain/time';

export function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ——————————————————————————————— Seed / perfil ———————————————————————————————

export const DEFAULT_PROFILE: Profile = {
  id: 'profile',
  name: '',
  sex: 'M',
  age: 25,
  heightCm: 175,
  weightKg: 70,
  goal: 'gain',
  activity: 'moderate',
  experience: 'beginner',
  surplusKcal: GOAL_DEFAULTS.gain.surplusKcal,
  proteinPerKg: GOAL_DEFAULTS.gain.proteinPerKg,
  fatPerKg: GOAL_DEFAULTS.gain.fatPerKg,
  waterMl: 2800,
  onboarded: false,
  theme: 'auto',
  blur: true,
  programStart: isoDate(),
};

/** Popula a biblioteca (alimentos, exercícios, treinos, equipamentos) na primeira abertura. */
export async function ensureSeeded() {
  await db.transaction('rw', [db.foods, db.exercises, db.workouts, db.settings], async () => {
    if ((await db.foods.count()) === 0) await db.foods.bulkPut(FOODS);
    if ((await db.exercises.count()) === 0) await db.exercises.bulkPut(EXERCISES);
    if ((await db.workouts.count()) === 0) await db.workouts.bulkPut(WORKOUTS);
    if (!(await db.settings.get('equipment'))) {
      await db.settings.put({ id: 'equipment', available: EQUIPMENT.filter((e) => e.default).map((e) => e.id) });
    }
  });
}

export async function getProfile(): Promise<Profile> {
  return (await db.profile.get('profile')) ?? DEFAULT_PROFILE;
}
export async function saveProfile(patch: Partial<Profile>) {
  const cur = await getProfile();
  await db.profile.put({ ...cur, ...patch, id: 'profile' });
}

export async function getSchedule(): Promise<Schedule> {
  return (await db.schedule.get('schedule')) ?? { id: 'schedule', ...DEFAULT_SCHEDULE };
}

/** Salva a agenda. Se `retimeMeals`, recalcula os horários das refeições existentes (mantendo os alimentos). */
export async function saveSchedule(s: Schedule, retimeMeals: boolean) {
  await db.schedule.put({ ...s, id: 'schedule' });
  if (!retimeMeals) return;
  const plan = planDay(s);
  const bySlot = new Map(plan.meals.map((m) => [m.slot, m]));
  const meals = await db.meals.toArray();
  const updates = meals.filter((m) => bySlot.has(m.slot)).map((m) => ({ ...m, time: bySlot.get(m.slot)!.time }));
  await db.meals.bulkPut(updates);
  // Refeições que passaram a existir (5 → 6) ou deixaram de existir (6 → 5).
  if (s.mealsPerDay === 5) {
    await db.meals.bulkDelete(meals.filter((m) => m.slot === 'ceia').map((m) => m.id));
  } else if (!meals.some((m) => m.slot === 'ceia')) {
    const ceia = bySlot.get('ceia')!;
    await db.meals.bulkPut(
      [0, 1, 2, 3, 4, 5, 6].map((wd) => ({ id: uid(), weekday: wd, slot: 'ceia' as const, name: ceia.name, time: ceia.time, items: MENU_VARIANTS.ceia[variantFor(wd)] })),
    );
  }
}

/** Gera o cardápio da semana a partir da agenda (substitui o atual). */
export async function generateWeekMenu(s: Schedule) {
  const plan = planDay(s);
  const meals: MealTemplate[] = [];
  for (let wd = 0; wd < 7; wd++) {
    for (const pm of plan.meals) {
      const slot = pm.slot as Exclude<MealSlot, 'extra'>;
      meals.push({ id: uid(), weekday: wd, slot, name: pm.name, time: pm.time, items: MENU_VARIANTS[slot][variantFor(wd)].map((i) => ({ ...i })) });
    }
  }
  await db.transaction('rw', db.meals, async () => {
    await db.meals.clear();
    await db.meals.bulkPut(meals);
  });
}

export function targetsFor(p: Profile) {
  const auto = computeTargets(p);
  return { ...auto, ...(p.manualTargets ?? {}), auto };
}

// ——————————————————————————————— Dieta ———————————————————————————————

export async function foodsMap(): Promise<Map<string, Food>> {
  return new Map((await db.foods.toArray()).map((f) => [f.id, f]));
}

export async function saveMeal(m: MealTemplate) {
  await db.meals.put(m);
}
export async function deleteMeal(id: string) {
  await db.meals.delete(id);
}

export async function addMeal(weekday: number, name: string, time: string, items: MealItem[] = [], slot: MealSlot = 'extra') {
  const m: MealTemplate = { id: uid(), weekday, slot, name, time, items };
  await db.meals.put(m);
  return m;
}

export async function copyDay(fromWeekday: number, toWeekdays: number[]) {
  const src = await db.meals.where('weekday').equals(fromWeekday).toArray();
  await db.transaction('rw', db.meals, async () => {
    for (const wd of toWeekdays) {
      if (wd === fromWeekday) continue;
      const old = await db.meals.where('weekday').equals(wd).primaryKeys();
      await db.meals.bulkDelete(old);
      await db.meals.bulkPut(src.map((m) => ({ ...m, id: uid(), weekday: wd, items: m.items.map((i) => ({ ...i })) })));
    }
  });
}

function roundQty(qty: number, unit: Food['unit'], wholeUnits = false) {
  if (unit === 'g' || unit === 'ml') return Math.max(10, Math.round(qty / 10) * 10);
  if (wholeUnits) return Math.max(1, Math.round(qty));
  return Math.max(0.5, Math.round(qty * 2) / 2);
}

type MacroKey = 'kcal' | 'protein' | 'fat';

/** Escala, num dia, os itens dos grupos indicados para que o macro `key` chegue ao alvo. */
function scaleGroups(day: MealTemplate[], foods: Map<string, Food>, groups: Set<string>, key: MacroKey, target: number, min: number, max: number) {
  const inGroup = (i: MealItem) => groups.has(foods.get(i.foodId)?.group ?? '');
  const total = day.reduce((s, m) => s + mealMacros(m.items, foods)[key], 0);
  const variable = day.reduce((s, m) => s + mealMacros(m.items.filter(inGroup), foods)[key], 0);
  if (variable <= 0) return;
  const factor = Math.max(min, Math.min(max, (target - (total - variable)) / variable));
  for (const m of day) {
    m.items = m.items.map((i) => {
      const f = foods.get(i.foodId);
      return f && inGroup(i) ? { ...i, qty: roundQty(i.qty * factor, f.unit, f.group === 'proteina') } : i;
    });
  }
}

/**
 * Ajusta as porções de cada dia às metas, em etapas:
 * proteínas/laticínios → proteína; gorduras → gordura; carboidratos/frutas → calorias.
 */
export async function scaleWeekToTarget(t: Pick<MacroTargets, 'kcal' | 'protein' | 'fat'>) {
  const foods = await foodsMap();
  const all = await db.meals.toArray();
  for (let wd = 0; wd < 7; wd++) {
    const day = all.filter((m) => m.weekday === wd);
    scaleGroups(day, foods, new Set(['proteina', 'laticinio']), 'protein', t.protein, 0.5, 1.8);
    scaleGroups(day, foods, new Set(['gordura']), 'fat', t.fat, 0.3, 2.5);
    scaleGroups(day, foods, new Set(['carboidrato', 'fruta']), 'kcal', t.kcal, 0.4, 2.5);
    await db.meals.bulkPut(day);
  }
}

/** Quantidade equivalente de outro alimento (mesmas kcal; proteínas e laticínios igualam a proteína). */
export function equivalentQty(from: Food, qty: number, to: Food): number {
  const byProtein = (from.group === 'proteina' || from.group === 'laticinio') && to.protein > 0;
  const base = byProtein ? (from.protein * qty) / from.portion : (from.kcal * qty) / from.portion;
  const per = byProtein ? to.protein / to.portion : to.kcal / to.portion;
  return per > 0 ? roundQty(base / per, to.unit) : qty;
}

export async function toggleMealLog(date: IsoDate, mealId: string) {
  const id = `${date}|${mealId}`;
  const cur = await db.mealLogs.get(id);
  const next: MealLog = { id, date, mealId, done: !cur?.done, at: new Date().toISOString() };
  await db.mealLogs.put(next);
  return next.done;
}

export async function addWater(date: IsoDate, deltaMl: number) {
  const cur = await db.water.get(date);
  await db.water.put({ date, ml: Math.max(0, (cur?.ml ?? 0) + deltaMl) });
}

// ——————————————————————————————— Treino ———————————————————————————————

export async function getEquipment(): Promise<EquipmentId[]> {
  return (await db.settings.get('equipment'))?.available ?? EQUIPMENT.filter((e) => e.default).map((e) => e.id);
}
export async function setEquipment(available: EquipmentId[]) {
  await db.settings.put({ id: 'equipment', available });
}

export function canDo(ex: Exercise, available: EquipmentId[]) {
  return ex.equipment.every((e) => available.includes(e));
}

/** O exercício planejado ou, se faltar equipamento, a primeira alternativa possível. */
export function resolveExercise(id: string, exercises: Map<string, Exercise>, available: EquipmentId[]): Exercise | undefined {
  const ex = exercises.get(id);
  if (!ex) return undefined;
  if (canDo(ex, available)) return ex;
  for (const alt of ex.alternatives) {
    const a = exercises.get(alt);
    if (a && canDo(a, available)) return a;
  }
  return undefined;
}

export async function saveWorkout(w: WorkoutTemplate) {
  await db.workouts.put(w);
}

export async function activeSession() {
  return db.sessions.where('status').equals('active').first();
}

export async function startSession(templateId: WorkoutId, deload = false): Promise<WorkoutSession> {
  const existing = await activeSession();
  if (existing) return existing;
  const s: WorkoutSession = { id: uid(), date: isoDate(), templateId, startedAt: new Date().toISOString(), status: 'active', deload, swaps: {} };
  await db.sessions.put(s);
  return s;
}

export async function updateSession(s: WorkoutSession) {
  await db.sessions.put(s);
}

/** Séries da última sessão concluída em que o exercício foi feito. */
export async function lastSetsFor(exerciseId: string, excludeSessionId?: string): Promise<SetLog[]> {
  const all = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const done = new Set((await db.sessions.where('status').equals('done').toArray()).map((s) => s.id));
  const valid = all.filter((s) => s.sessionId !== excludeSessionId && done.has(s.sessionId));
  if (!valid.length) return [];
  const lastSession = valid.reduce((a, b) => (a.at > b.at ? a : b)).sessionId;
  return valid.filter((s) => s.sessionId === lastSession).sort((a, b) => a.setIndex - b.setIndex);
}

export async function logSet(sessionId: string, exerciseId: string, setIndex: number, weight: number, reps: number): Promise<string[]> {
  const prev = (await db.sets.where('exerciseId').equals(exerciseId).toArray()).filter((s) => s.sessionId !== sessionId);
  const prs = detectPRs(computeRecord(prev), { weight, reps });
  const existing = (await db.sets.where('sessionId').equals(sessionId).toArray()).find((s) => s.exerciseId === exerciseId && s.setIndex === setIndex);
  await db.sets.put({ id: existing?.id ?? uid(), sessionId, exerciseId, setIndex, weight, reps, date: isoDate(), at: new Date().toISOString() });
  return prs;
}

export async function deleteSet(id: string) {
  await db.sets.delete(id);
}

export async function finishSession(sessionId: string) {
  const s = await db.sessions.get(sessionId);
  if (!s) return;
  const sets = await db.sets.where('sessionId').equals(sessionId).toArray();
  const prs: string[] = [];
  const byEx = new Map<string, SetLog[]>();
  sets.forEach((x) => byEx.set(x.exerciseId, [...(byEx.get(x.exerciseId) ?? []), x]));
  for (const [exId, list] of byEx) {
    const prev = (await db.sets.where('exerciseId').equals(exId).toArray()).filter((x) => x.sessionId !== sessionId);
    if (list.some((x) => detectPRs(computeRecord(prev), x).length)) prs.push(exId);
  }
  const endedAt = new Date().toISOString();
  const durationMin = Math.round((new Date(endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
  const done: WorkoutSession = { ...s, endedAt, durationMin, volumeKg: Math.round(volume(sets)), prs, status: 'done' };
  await db.sessions.put(done);
  return done;
}

export async function discardSession(sessionId: string) {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

// ——————————————————————————————— Evolução ———————————————————————————————

export async function saveMetric(m: Omit<BodyMetric, 'id'> & { id?: string }) {
  // Uma entrada por dia: mescla com a existente.
  const existing = await db.metrics.where('date').equals(m.date).first();
  const merged = { ...(existing ?? {}), ...Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined && v !== null && v !== '')) } as BodyMetric;
  merged.id = existing?.id ?? m.id ?? uid();
  await db.metrics.put(merged);
}
export async function deleteMetric(id: string) {
  await db.metrics.delete(id);
}

export async function addPhoto(date: IsoDate, pose: PhotoPose, blob: Blob) {
  await db.photos.put({ id: uid(), date, pose, blob });
}
export async function deletePhoto(id: string) {
  await db.photos.delete(id);
}

export async function saveCheckin(c: Omit<Checkin, 'id'>) {
  const existing = await db.checkins.where('date').equals(c.date).first();
  await db.checkins.put({ ...c, id: existing?.id ?? uid() });
}

export async function saveGoal(g: Omit<GoalItem, 'id'> & { id?: string }) {
  await db.goals.put({ ...g, id: g.id ?? uid() });
}
export async function deleteGoal(id: string) {
  await db.goals.delete(id);
}

// ——————————————————————————————— Backup ———————————————————————————————

const TABLES = ['profile', 'schedule', 'settings', 'foods', 'meals', 'mealLogs', 'water', 'exercises', 'workouts', 'sessions', 'sets', 'metrics', 'checkins', 'goals'] as const;

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}

export async function exportBackup(includePhotos = true) {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  if (includePhotos) {
    const photos = await db.photos.toArray();
    data.photos = await Promise.all(photos.map(async (p: Photo) => ({ ...p, blob: await blobToDataUrl(p.blob) })));
  }
  await saveProfile({ lastBackupAt: new Date().toISOString() });
  return { app: 'forja', version: 1, exportedAt: new Date().toISOString(), data };
}

export async function importBackup(json: { app?: string; data?: Record<string, unknown[]> }) {
  if (json.app !== 'forja' || !json.data) throw new Error('Arquivo de backup inválido.');
  const data = json.data;
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLES) {
      if (!Array.isArray(data[t])) continue;
      await db.table(t).clear();
      await db.table(t).bulkPut(data[t]);
    }
    if (Array.isArray(data.photos)) {
      await db.photos.clear();
      for (const p of data.photos as (Omit<Photo, 'blob'> & { blob: string })[]) {
        const blob = await (await fetch(p.blob)).blob();
        await db.photos.put({ ...p, blob });
      }
    }
  });
}

function toCsv(rows: Record<string, unknown>[], cols: string[]) {
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
}

export async function exportCsv() {
  const metrics = await db.metrics.orderBy('date').toArray();
  const sets = await db.sets.orderBy('date').toArray();
  const ex = new Map((await db.exercises.toArray()).map((e) => [e.id, e.name]));
  return {
    medidas: toCsv(metrics as unknown as Record<string, unknown>[], ['date', 'weight', 'bodyFat', 'chest', 'waist', 'abdomen', 'hips', 'armR', 'armL', 'thighR', 'thighL', 'calf']),
    series: toCsv(
      sets.map((s) => ({ ...s, exercicio: ex.get(s.exerciseId) ?? s.exerciseId })),
      ['date', 'exercicio', 'setIndex', 'weight', 'reps'],
    ),
  };
}

export async function resetAll() {
  await db.delete();
  await db.open();
}
