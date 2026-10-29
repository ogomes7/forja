import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { DEFAULT_PROFILE, getSchedule } from './repo';
import type { Exercise, Food, IsoDate } from './types';
import { EQUIPMENT } from '@/seed/exercises';

// Hooks reativos: a tela se atualiza sozinha quando os dados mudam.

export const useProfile = () => useLiveQuery(async () => (await db.profile.get('profile')) ?? DEFAULT_PROFILE);
export const useSchedule = () => useLiveQuery(getSchedule);

export const useFoods = () =>
  useLiveQuery(async () => {
    const list = await db.foods.toArray();
    return { list: list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), map: new Map<string, Food>(list.map((f) => [f.id, f])) };
  });

export const useMealsForWeekday = (weekday: number) =>
  useLiveQuery(async () => (await db.meals.where('weekday').equals(weekday).toArray()).sort((a, b) => a.time.localeCompare(b.time)), [weekday]);

export const useAllMeals = () => useLiveQuery(() => db.meals.toArray());

export const useMealLogs = (date: IsoDate) =>
  useLiveQuery(async () => new Map((await db.mealLogs.where('date').equals(date).toArray()).map((l) => [l.mealId, l.done])), [date]);

export const useWater = (date: IsoDate) => useLiveQuery(async () => (await db.water.get(date))?.ml ?? 0, [date]);

export const useExercises = () =>
  useLiveQuery(async () => {
    const list = await db.exercises.toArray();
    return { list: list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), map: new Map<string, Exercise>(list.map((e) => [e.id, e])) };
  });

export const useWorkouts = () => useLiveQuery(async () => (await db.workouts.toArray()).sort((a, b) => a.id.localeCompare(b.id)));

export const useEquipment = () =>
  useLiveQuery(async () => (await db.settings.get('equipment'))?.available ?? EQUIPMENT.filter((e) => e.default).map((e) => e.id));

export const useActiveSession = () => useLiveQuery(() => db.sessions.where('status').equals('active').first());

export const useSessions = () => useLiveQuery(async () => (await db.sessions.where('status').equals('done').toArray()).sort((a, b) => b.startedAt.localeCompare(a.startedAt)));

export const useSessionSets = (sessionId?: string) =>
  useLiveQuery(async () => (sessionId ? db.sets.where('sessionId').equals(sessionId).toArray() : []), [sessionId]);

export const useAllSets = () => useLiveQuery(() => db.sets.toArray());

export const useMetrics = () => useLiveQuery(() => db.metrics.orderBy('date').toArray());
export const usePhotos = () => useLiveQuery(async () => (await db.photos.orderBy('date').toArray()).reverse());
export const useCheckins = () => useLiveQuery(async () => (await db.checkins.orderBy('date').toArray()).reverse());
export const useGoals = () => useLiveQuery(() => db.goals.toArray());
export const useAllMealLogs = () => useLiveQuery(() => db.mealLogs.toArray());
