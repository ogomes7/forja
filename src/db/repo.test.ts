import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  copyDay, ensureSeeded, equivalentQty, finishSession, foodsMap, generateWeekMenu, getSchedule, lastSetsFor, logSet, resolveExercise, saveSchedule, scaleWeekToTarget, startSession,
} from './repo';
import { mealMacros } from '@/domain/nutrition';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded();
});

describe('repositório', () => {
  it('gera 6 refeições por dia com horários do planejador', async () => {
    await generateWeekMenu(await getSchedule());
    const mon = (await db.meals.where('weekday').equals(1).toArray()).sort((a, b) => a.time.localeCompare(b.time));
    expect(mon.map((m) => m.time)).toEqual(['05:45', '08:20', '11:30', '14:45', '18:00', '21:15']);
    expect(await db.meals.count()).toBe(42);
  });

  it('cardápio-exemplo fica perto de 2.900 kcal e ≥ 150 g de proteína', async () => {
    await generateWeekMenu(await getSchedule());
    const foods = await foodsMap();
    for (let wd = 0; wd < 7; wd++) {
      const day = await db.meals.where('weekday').equals(wd).toArray();
      const m = day.reduce((s, x) => s + mealMacros(x.items, foods).kcal, 0);
      const p = day.reduce((s, x) => s + mealMacros(x.items, foods).protein, 0);
      expect(m).toBeGreaterThan(2500);
      expect(m).toBeLessThan(3400);
      expect(p).toBeGreaterThan(150);
    }
  });

  it('mudar a saída re-horariza as refeições mantendo os alimentos', async () => {
    const s = await getSchedule();
    await generateWeekMenu(s);
    const before = await db.meals.where('weekday').equals(1).toArray();
    await saveSchedule({ ...s, departure: '06:00' }, true);
    const after = await db.meals.where('weekday').equals(1).toArray();
    const pre = after.find((m) => m.slot === 'pre')!;
    expect(pre.time).toBe('04:45');
    expect(pre.items).toEqual(before.find((m) => m.slot === 'pre')!.items);
  });

  it('5 refeições remove a ceia', async () => {
    const s = await getSchedule();
    await generateWeekMenu(s);
    await saveSchedule({ ...s, mealsPerDay: 5 }, true);
    expect(await db.meals.where('weekday').equals(1).count()).toBe(5);
  });

  it('copia um dia para outros', async () => {
    await generateWeekMenu(await getSchedule());
    await copyDay(1, [2, 3]);
    const byTime = (wd: number) => db.meals.where('weekday').equals(wd).toArray().then((l) => l.sort((x, y) => x.time.localeCompare(y.time)).map((m) => m.items));
    const a = await byTime(1);
    const b = await byTime(3);
    expect(b).toEqual(a);
  });

  it('escala o cardápio para a meta de kcal', async () => {
    await generateWeekMenu(await getSchedule());
    await scaleWeekToTarget(3300);
    const foods = await foodsMap();
    const day = await db.meals.where('weekday').equals(1).toArray();
    const kcal = day.reduce((s, x) => s + mealMacros(x.items, foods).kcal, 0);
    expect(Math.abs(kcal - 3300)).toBeLessThan(200);
  });

  it('substituição equivalente', async () => {
    const f = await foodsMap();
    expect(equivalentQty(f.get('arroz')!, 100, f.get('macarrao')!)).toBe(80);
    expect(equivalentQty(f.get('frango')!, 100, f.get('ovo')!)).toBe(5);
  });

  it('troca exercício quando falta equipamento', async () => {
    const map = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    expect(resolveExercise('puxada-frente', map, ['barra_fixa'])?.id).toBe('barra-fixa');
    expect(resolveExercise('leg-press', map, ['halteres'])?.id).toBe('agachamento-goblet');
  });

  it('registra treino, volume, recordes e última carga', async () => {
    const s1 = await startSession('A');
    await logSet(s1.id, 'supino-halteres', 0, 20, 10);
    await logSet(s1.id, 'supino-halteres', 1, 20, 9);
    const done1 = await finishSession(s1.id);
    expect(done1?.volumeKg).toBe(380);
    expect(done1?.prs).toEqual([]);

    const s2 = await startSession('A');
    expect((await lastSetsFor('supino-halteres', s2.id)).map((x) => x.reps)).toEqual([10, 9]);
    const prs = await logSet(s2.id, 'supino-halteres', 0, 22, 8);
    expect(prs).toContain('carga');
    const done2 = await finishSession(s2.id);
    expect(done2?.prs).toEqual(['supino-halteres']);
  });
});
