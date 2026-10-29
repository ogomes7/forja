import Dexie, { type EntityTable } from 'dexie';
import type {
  BodyMetric, Checkin, Exercise, Food, GoalItem, MealLog, MealTemplate, Photo, Profile, Schedule, SetLog, Settings, WaterLog, WorkoutSession, WorkoutTemplate,
} from './types';

/**
 * Banco local (IndexedDB). A interface acessa os dados só pelos repositórios em ./repo.ts,
 * para facilitar trocar por sync (Supabase) ou app nativo no futuro.
 */
export class AppDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  schedule!: EntityTable<Schedule, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  meals!: EntityTable<MealTemplate, 'id'>;
  mealLogs!: EntityTable<MealLog, 'id'>;
  water!: EntityTable<WaterLog, 'date'>;
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<WorkoutTemplate, 'id'>;
  sessions!: EntityTable<WorkoutSession, 'id'>;
  sets!: EntityTable<SetLog, 'id'>;
  metrics!: EntityTable<BodyMetric, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  checkins!: EntityTable<Checkin, 'id'>;
  goals!: EntityTable<GoalItem, 'id'>;

  constructor(name = 'forja') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      schedule: 'id',
      settings: 'id',
      foods: 'id, group',
      meals: 'id, weekday',
      mealLogs: 'id, date',
      water: 'date',
      exercises: 'id',
      workouts: 'id',
      sessions: 'id, date, templateId, status',
      sets: 'id, sessionId, exerciseId, date',
      metrics: 'id, date',
      photos: 'id, date',
      checkins: 'id, date',
      goals: 'id',
    });
  }
}

export const db = new AppDB();
