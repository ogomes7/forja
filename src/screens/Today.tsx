import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Button, Card, CheckButton, IconButton, PageHeader, Ring, SectionTitle, cx } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useActiveSession, useFoods, useMealLogs, useMealsForWeekday, useProfile, useSchedule, useSessions, useWater, useWorkouts } from '@/db/hooks';
import { addWater, startSession, targetsFor, toggleMealLog } from '@/db/repo';
import { mealMacros, sumMacros } from '@/domain/nutrition';
import { planDay, workoutForDate } from '@/domain/planner';
import { DELOAD_EVERY_WEEKS, deloadDue } from '@/domain/progression';
import { WEEKDAYS, addDays, daysBetween, isoDate, toMin } from '@/domain/time';
import type { WorkoutId } from '@/db/types';

const MESSAGES = [
  'Constância vence intensidade. Um treino de cada vez.',
  'Comer bem também é treino.',
  'Sono é onde o músculo cresce.',
  'Pequenos aumentos de carga, grandes resultados.',
  'Fez o básico bem feito? Já é vitória.',
  'Hidrate-se: água ajuda força e foco.',
  'Proteína em todas as refeições.',
];

export function Today() {
  const today = isoDate();
  const wd = new Date().getDay();
  const profile = useProfile();
  const schedule = useSchedule();
  const meals = useMealsForWeekday(wd);
  const tomorrowMeals = useMealsForWeekday((wd + 1) % 7);
  const logs = useMealLogs(today);
  const foods = useFoods();
  const water = useWater(today) ?? 0;
  const workouts = useWorkouts();
  const sessions = useSessions();
  const active = useActiveSession();
  const nav = useNavigate();

  const plan = useMemo(() => (schedule ? planDay(schedule) : null), [schedule]);
  if (!profile || !schedule || !meals || !foods || !logs || !plan || !workouts) return null;

  const targets = targetsFor(profile);
  const doneMeals = meals.filter((m) => logs.get(m.id));
  const eaten = sumMacros(doneMeals.map((m) => mealMacros(m.items, foods.map)));
  const todayWorkout = workoutForDate(today, profile.programStart, schedule.trainingDays) as WorkoutId | null;
  const tomorrowWorkout = workoutForDate(addDays(today, 1), profile.programStart, schedule.trainingDays);
  const workoutDone = sessions?.some((s) => s.date === today);
  const tpl = workouts.find((w) => w.id === todayWorkout);
  const weeksSinceDeload = Math.floor(daysBetween(profile.lastDeloadAt ?? profile.programStart, today) / 7);
  const showBackup = !profile.lastBackupAt ? daysBetween(profile.programStart, today) >= 7 : daysBetween(profile.lastBackupAt.slice(0, 10), today) >= 30;

  type Item = { time: string; title: string; detail?: string; icon: string; kind: 'info' | 'meal' | 'workout'; mealId?: string; done?: boolean };
  const items: Item[] = [
    { time: plan.wake, title: 'Acordar e hidratar', detail: '1 copo de água (300–500 ml)', icon: 'alarm', kind: 'info' },
    ...meals.map<Item>((m) => {
      const mm = mealMacros(m.items, foods.map);
      return {
        time: m.time,
        title: m.name,
        detail: `${Math.round(mm.kcal)} kcal · ${Math.round(mm.protein)} g prot · ${m.items.map((i) => foods.map.get(i.foodId)?.name ?? '?').join(', ')}`,
        icon: 'diet',
        kind: 'meal',
        mealId: m.id,
        done: !!logs.get(m.id),
      };
    }),
    { time: plan.departure, title: 'Sair de casa', detail: `Chegada ${plan.gymArrival}`, icon: 'walk', kind: 'info' },
    todayWorkout
      ? { time: plan.gymArrival, title: `${tpl?.name ?? 'Treino'} · ${tpl?.focus ?? ''}`, detail: `Até ${plan.gymDeadline} (${plan.windowMin} min)`, icon: 'dumbbell', kind: 'workout', done: workoutDone }
      : { time: plan.gymArrival, title: 'Descanso', detail: 'Recuperação também faz o músculo crescer. Uma caminhada leve é bem-vinda.', icon: 'bed', kind: 'info' },
    { time: plan.bedtime, title: 'Dormir', detail: `Meta: ${String(schedule.sleepHours).replace('.', ',')} h de sono`, icon: 'moon', kind: 'info' },
  ];
  // Ordena pelo horário, tratando a madrugada (antes de acordar) como fim do dia.
  const wakeMin = toMin(plan.wake);
  const key = (t: string) => (toMin(t) < wakeMin ? toMin(t) + 1440 : toMin(t));
  items.sort((a, b) => key(a.time) - key(b.time));
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const nowKey = now < wakeMin ? now + 1440 : now;
  const nextIdx = items.findIndex((i) => key(i.time) >= nowKey - 30 && !i.done);

  async function goWorkout() {
    if (!todayWorkout) return;
    if (!active) await startSession(todayWorkout);
    nav('/treino/ao-vivo');
  }

  const firstMealTomorrow = tomorrowMeals?.[0];
  const greeting = now < 720 ? 'Bom dia' : now < 1080 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <PageHeader
        subtitle={`${WEEKDAYS[wd]}, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`}
        title={`${greeting}${profile.name ? `, ${profile.name}` : ''}`}
        right={
          <Link to="/ajustes" aria-label="Ajustes" className="glass press flex h-11 w-11 items-center justify-center rounded-full">
            <Icon name="gear" />
          </Link>
        }
      />

      {showBackup && (
        <Link to="/ajustes" className="glass press mb-3 flex items-center gap-3 rounded-[22px] p-3 text-[14px]">
          <span className="text-warn"><Icon name="download" /></span>
          <span className="flex-1">Faça um backup: o iPhone pode apagar dados de apps pouco usados.</span>
          <Icon name="right" size={18} className="text-ink-3" />
        </Link>
      )}

      <Card className="flex items-center justify-between gap-2">
        <RingStat label="Refeições" value={meals.length ? doneMeals.length / meals.length : 0} color="var(--accent)" text={`${doneMeals.length}/${meals.length}`} />
        <RingStat label="Calorias" value={eaten.kcal / targets.kcal} color="var(--kcal)" text={`${Math.round((eaten.kcal / targets.kcal) * 100)}%`} />
        <RingStat label="Proteína" value={eaten.protein / targets.protein} color="var(--prot)" text={`${Math.round(eaten.protein)}g`} />
        <button type="button" onClick={() => addWater(today, 250)} aria-label="Adicionar 250 ml de água" className="press flex flex-col items-center gap-1">
          <Ring value={water / profile.waterMl} color="var(--water)" size={62} label="Água">
            <span className="tabular text-[13px] font-bold">{(water / 1000).toFixed(1).replace('.', ',')}L</span>
          </Ring>
          <span className="text-[12px] text-ink-3">Água +250</span>
        </button>
      </Card>

      {todayWorkout && !workoutDone && (
        <Button variant="primary" size="lg" className="mt-3 w-full" onClick={goWorkout}>
          <Icon name="play" size={20} /> {active ? 'Continuar treino' : `Iniciar ${tpl?.name ?? 'treino'}`}
        </Button>
      )}

      {deloadDue(weeksSinceDeload) && !profile.deloadFrom && (
        <Card className="mt-3 flex gap-3 text-[14px]">
          <span className="text-accent"><Icon name="info" /></span>
          <p>São {weeksSinceDeload} semanas de treino. Que tal uma <b>semana de deload</b> (menos séries e 90% da carga)? Ative em Treino. (Sugerido a cada ~{DELOAD_EVERY_WEEKS} semanas.)</p>
        </Card>
      )}

      <SectionTitle>Linha do tempo</SectionTitle>
      <Card className="p-0" as="div">
        <ol aria-label="Linha do tempo de hoje">
          {items.map((it, i) => (
            <li key={`${it.time}-${it.title}`} className={cx('relative flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-[color:var(--glass-edge)]', i === nextIdx && 'bg-accent-soft', it.done && 'opacity-60')}>
              <span className="tabular w-12 shrink-0 text-[15px] font-semibold">{it.time}</span>
              <span className={cx('shrink-0', it.kind === 'workout' ? 'text-accent' : 'text-ink-3')}><Icon name={it.icon} size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className={cx('font-semibold', it.done && 'line-through')}>{it.title}</p>
                {it.detail && <p className="truncate text-[13px] text-ink-3">{it.detail}</p>}
              </div>
              {it.kind === 'meal' && <CheckButton checked={!!it.done} onToggle={() => toggleMealLog(today, it.mealId!)} label={`Marcar ${it.title}`} />}
              {it.kind === 'workout' && (it.done ? <span className="text-ok"><Icon name="check" /></span> : <IconButton icon="right" label="Abrir treino" onClick={goWorkout} />)}
            </li>
          ))}
        </ol>
      </Card>
      {plan.preWorkout && (
        <p className="mt-2 px-1 text-[13px] text-ink-3">
          Acordou em cima da hora? Coma algo rápido às {plan.quickSnack}: banana, mel ou torrada.
        </p>
      )}

      <SectionTitle>Amanhã</SectionTitle>
      <Card className="grid grid-cols-2 gap-3">
        <Mini icon="alarm" label="Acordar" value={plan.wake} />
        <Mini icon="walk" label="Sair" value={plan.departure} />
        <Mini icon="dumbbell" label="Treino" value={tomorrowWorkout ? `Treino ${tomorrowWorkout}` : 'Descanso'} />
        <Mini icon="diet" label="1ª refeição" value={firstMealTomorrow ? `${firstMealTomorrow.time} ${firstMealTomorrow.name}` : '—'} />
        <p className="col-span-2 text-[13px] text-ink-3">Para acordar às {plan.wake}, durma às {plan.bedtime}. Configure seu despertador.</p>
      </Card>

      <p className="mt-6 text-center text-[14px] text-ink-3">{MESSAGES[new Date().getDate() % MESSAGES.length]}</p>
    </>
  );
}

function RingStat({ label, value, color, text }: { label: string; value: number; color: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Ring value={value} color={color} size={62} label={label}>
        <span className="tabular text-[13px] font-bold">{text}</span>
      </Ring>
      <span className="text-[12px] text-ink-3">{label}</span>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-accent"><Icon name={icon} size={20} /></span>
      <div className="min-w-0">
        <p className="text-[12px] text-ink-3">{label}</p>
        <p className="tabular truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}
