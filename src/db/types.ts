// Modelo de dados. Tudo é serializável em JSON (exceto Photo.blob) para backup e sync futuro.

export type Sex = 'M' | 'F';
export type Goal = 'gain' | 'maintain' | 'cut';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Hhmm = string; // "07:00"
export type IsoDate = string; // "2026-10-29"

export interface Profile {
  id: 'profile';
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activity: Activity;
  experience: Experience;
  /** kcal acima (ou abaixo, se negativo) do gasto total. */
  surplusKcal: number;
  proteinPerKg: number;
  fatPerKg: number;
  /** Se definido, sobrescreve o cálculo automático. */
  manualTargets?: MacroTargets;
  waterMl: number;
  onboarded: boolean;
  theme: 'auto' | 'light' | 'dark';
  blur: boolean;
  lastBackupAt?: string;
  programStart: IsoDate;
  lastDeloadAt?: IsoDate;
  /** Semana de deload em andamento (data de início). */
  deloadFrom?: IsoDate;
}

export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Schedule {
  id: 'schedule';
  departure: Hhmm;
  commuteMin: number;
  gymDeadline: Hhmm;
  sleepHours: number;
  /** Minutos entre acordar e sair de casa. */
  prepMin: number;
  /** Minutos entre o fim do treino e o pós-treino. */
  postDelayMin: number;
  mealsPerDay: 5 | 6;
  /** Dias de treino: 0 = domingo … 6 = sábado. */
  trainingDays: number[];
}

export type FoodGroup = 'proteina' | 'carboidrato' | 'gordura' | 'fruta' | 'laticinio' | 'vegetal' | 'bebida' | 'suplemento';
export type FoodUnit = 'g' | 'ml' | 'un' | 'fatia' | 'colher' | 'concha' | 'scoop';

export interface Food {
  id: string;
  name: string;
  group: FoodGroup;
  unit: FoodUnit;
  /** Quantidade de referência (ex.: 100 g ou 1 un) a que os macros se referem. */
  portion: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealItem {
  foodId: string;
  qty: number;
}

export type MealSlot = 'pre' | 'pos' | 'almoco' | 'lanche' | 'jantar' | 'ceia' | 'extra';

export interface MealTemplate {
  id: string;
  weekday: number; // 0..6
  slot: MealSlot;
  name: string;
  time: Hhmm;
  items: MealItem[];
}

export interface MealLog {
  id: string; // `${date}|${mealId}`
  date: IsoDate;
  mealId: string;
  done: boolean;
  at: string;
}

export interface WaterLog {
  date: IsoDate;
  ml: number;
}

export type EquipmentId =
  | 'halteres'
  | 'barra'
  | 'barra_ez'
  | 'banco'
  | 'banco_inclinado'
  | 'polia'
  | 'puxador'
  | 'leg_press'
  | 'extensora'
  | 'flexora'
  | 'barra_fixa'
  | 'maquina_supino'
  | 'maquina_ombro'
  | 'smith'
  | 'elastico'
  | 'peso_corporal';

export type Muscle =
  | 'peito'
  | 'ombros'
  | 'triceps'
  | 'costas'
  | 'biceps'
  | 'antebraco'
  | 'core'
  | 'quadriceps'
  | 'posteriores'
  | 'gluteos'
  | 'panturrilha'
  | 'trapezio';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  /** Todos os equipamentos necessários. */
  equipment: EquipmentId[];
  steps: string[];
  mistakes: string[];
  safety: string;
  /** Caminhos relativos em /public (2 quadros). Vazio → ilustração SVG. */
  images: string[];
  alternatives: string[];
  compound: boolean;
  /** Incremento de carga sugerido (kg). */
  increment: number;
  /** 'reps' ou 's' (isometria). */
  unit: 'reps' | 's';
  /** Exercício unilateral (registrar carga por lado). */
  perSide?: boolean;
}

export type WorkoutId = 'A' | 'B' | 'C';

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  note?: string;
}

export interface WorkoutTemplate {
  id: WorkoutId;
  name: string;
  focus: string;
  warmup: string;
  cooldown: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutSession {
  id: string;
  date: IsoDate;
  templateId: WorkoutId;
  startedAt: string;
  endedAt?: string;
  durationMin?: number;
  volumeKg?: number;
  prs?: string[];
  deload?: boolean;
  /** Substituições feitas na sessão: exercício original → usado. */
  swaps?: Record<string, string>;
  status: 'active' | 'done' | 'discarded';
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  date: IsoDate;
  at: string;
}

export type MeasureKey = 'chest' | 'waist' | 'abdomen' | 'hips' | 'armR' | 'armL' | 'thighR' | 'thighL' | 'calf';

export interface BodyMetric {
  id: string;
  date: IsoDate;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hips?: number;
  armR?: number;
  armL?: number;
  thighR?: number;
  thighL?: number;
  calf?: number;
}

export type PhotoPose = 'frente' | 'lado' | 'costas';

export interface Photo {
  id: string;
  date: IsoDate;
  pose: PhotoPose;
  blob: Blob;
}

export interface Checkin {
  id: string;
  date: IsoDate;
  avgWeight?: number;
  feeling: number; // 1..5
  notes: string;
  suggestions: string[];
}

export interface GoalItem {
  id: string;
  kind: 'weight' | 'measure' | 'lift';
  /** Chave da medida (MeasureKey) ou id do exercício. */
  key?: string;
  title: string;
  start: number;
  target: number;
  createdAt: IsoDate;
}

export interface Settings {
  id: 'equipment';
  available: EquipmentId[];
}
