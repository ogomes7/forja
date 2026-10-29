import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackHeader, Bar, Button, Card, IconButton, PageHeader, SectionTitle, Sheet, Stepper, cx } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ExerciseAnim } from '@/components/ExerciseAnim';
import { useActiveSession, useAllSets, useEquipment, useExercises, useProfile, useSchedule, useSessions, useWorkouts } from '@/db/hooks';
import { canDo, lastSetsFor, saveProfile, saveWorkout, setEquipment, startSession } from '@/db/repo';
import type { EquipmentId, Exercise, WorkoutId, WorkoutTemplate } from '@/db/types';
import { planDay, workoutForDate } from '@/domain/planner';
import { computeRecord, deloadDue, suggestNext, fmt } from '@/domain/progression';
import { estimateWorkoutMin } from '@/domain/workoutTime';
import { WEEKDAYS, addDays, daysBetween, formatDateBR, isoDate, weekStart } from '@/domain/time';
import { EQUIPMENT, MUSCLE_LABEL } from '@/seed/exercises';
import { buildPlan, fmtSet, swapOptions } from './plan';
import { useUi } from '@/store';

// ——————————————————— Visão geral ———————————————————
export function WorkoutHome() {
  const profile = useProfile();
  const schedule = useSchedule();
  const workouts = useWorkouts();
  const exercises = useExercises();
  const active = useActiveSession();
  const sets = useAllSets();
  const sessions = useSessions();
  const nav = useNavigate();
  if (!profile || !schedule || !workouts || !exercises || !sets) return null;

  const today = isoDate();
  const window = planDay(schedule).windowMin;
  const todayId = workoutForDate(today, profile.programStart, schedule.trainingDays) as WorkoutId | null;
  let next: { date: string; id: string } | null = null;
  for (let i = 1; i <= 7 && !next; i++) {
    const d = addDays(today, i);
    const id = workoutForDate(d, profile.programStart, schedule.trainingDays);
    if (id) next = { date: d, id };
  }
  const doneToday = sessions?.some((s) => s.date === today);
  const weeks = Math.floor(daysBetween(profile.lastDeloadAt ?? profile.programStart, today) / 7);
  const inDeload = !!profile.deloadFrom && daysBetween(profile.deloadFrom, today) < 7;
  const consecutive = schedule.trainingDays.some((d) => schedule.trainingDays.includes((d + 1) % 7));

  // Séries por grupo muscular na semana (Seg–Dom)
  const ws = weekStart(today);
  const weekSets = sets.filter((s) => s.date >= ws);
  const perMuscle = new Map<string, number>();
  weekSets.forEach((s) => exercises.map.get(s.exerciseId)?.primary.forEach((m) => perMuscle.set(m, (perMuscle.get(m) ?? 0) + 1)));

  async function start(id: WorkoutId) {
    if (!active) await startSession(id, inDeload);
    nav('/treino/ao-vivo');
  }

  return (
    <>
      <PageHeader title="Treino" subtitle={`Ciclo ABC · ${schedule.trainingDays.length}× por semana`} />

      <Card className="space-y-3">
        {active ? (
          <>
            <p className="font-semibold">Treino {active.templateId} em andamento</p>
            <Button variant="primary" size="lg" className="w-full" onClick={() => nav('/treino/ao-vivo')}><Icon name="play" size={20} /> Continuar treino</Button>
          </>
        ) : todayId && !doneToday ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Hoje</p>
                <p className="text-[22px] font-bold">Treino {todayId}</p>
                <p className="text-[14px] text-ink-2">{workouts.find((w) => w.id === todayId)?.focus}</p>
              </div>
              {inDeload && <span className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent">Deload</span>}
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={() => start(todayId)}><Icon name="play" size={20} /> Iniciar treino</Button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-accent"><Icon name={doneToday ? 'check' : 'bed'} size={28} /></span>
            <div>
              <p className="font-semibold">{doneToday ? 'Treino de hoje concluído 💪' : 'Hoje é dia de descanso'}</p>
              {next && <p className="text-[14px] text-ink-3">Próximo: Treino {next.id} · {WEEKDAYS[new Date(next.date + 'T00:00').getDay()]}</p>}
            </div>
          </div>
        )}
      </Card>

      <nav className="-mx-1 mt-3 flex gap-2 no-scrollbar overflow-x-auto px-1 pb-1" aria-label="Atalhos do treino">
        <Chip to="/treino/equipamentos" icon="dumbbell" label="Equipamentos" />
        <Chip to="/treino/biblioteca" icon="list" label="Exercícios" />
        <Chip to="/treino/historico" icon="clock" label="Histórico" />
      </nav>

      <SectionTitle>Seus treinos</SectionTitle>
      <ul className="space-y-3">
        {workouts.map((w) => {
          const min = estimateWorkoutMin(w.exercises, exercises.map);
          const over = min > window;
          return (
            <li key={w.id}>
              <Link to={`/treino/${w.id}`} className="glass press flex items-center gap-4 rounded-[22px] p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-[22px] font-bold text-accent">{w.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{w.focus}</p>
                  <p className={cx('tabular text-[13px]', over ? 'text-warn' : 'text-ink-3')}>
                    {w.exercises.length} exercícios · ~{min} min {over ? `(passa da janela de ${window} min)` : `de ${window} min`}
                  </p>
                </div>
                <Icon name="right" className="text-ink-3" />
              </Link>
            </li>
          );
        })}
      </ul>

      <SectionTitle>Séries na semana por músculo</SectionTitle>
      <Card className="space-y-2">
        {['peito', 'costas', 'ombros', 'quadriceps', 'posteriores', 'gluteos', 'biceps', 'triceps', 'panturrilha', 'core'].map((m) => {
          const n = perMuscle.get(m) ?? 0;
          return (
            <div key={m} className="flex items-center gap-3 text-[14px]">
              <span className="w-24 shrink-0 text-ink-2">{MUSCLE_LABEL[m]}</span>
              <Bar value={n / 10} className="flex-1" color={n >= 10 ? 'var(--ok)' : 'var(--accent)'} />
              <span className="tabular w-6 text-right font-semibold">{n}</span>
            </div>
          );
        })}
        <p className="text-[12px] text-ink-3">Referência para hipertrofia: ~10 séries semanais por músculo (iniciante). Conta só o músculo principal.</p>
      </Card>

      <SectionTitle>Recuperação</SectionTitle>
      <Card className="space-y-3 text-[14px]">
        {consecutive && <p className="text-warn">Você treina em dias seguidos. Para iniciante, prefira 1 dia de descanso entre treinos.</p>}
        <p>Ganho de massa exige recuperação: durma {String(schedule.sleepHours).replace('.', ',')} h e coma o suficiente nos dias de descanso também.</p>
        {inDeload ? (
          <div className="flex items-center justify-between gap-2">
            <p>Semana de deload ativa até {formatDateBR(addDays(profile.deloadFrom!, 6))}.</p>
            <Button size="sm" onClick={() => saveProfile({ deloadFrom: undefined })}>Encerrar</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p>{deloadDue(weeks) ? `São ${weeks} semanas de treino: hora de um deload.` : `Deload sugerido a cada 6–8 semanas (você está na semana ${weeks + 1}).`}</p>
            <Button size="sm" variant={deloadDue(weeks) ? 'primary' : 'glass'} onClick={() => saveProfile({ deloadFrom: today, lastDeloadAt: today })}>Fazer deload</Button>
          </div>
        )}
        <p className="text-[12px] text-ink-3">Deload: ~60% das séries e 90% da carga por uma semana.</p>
      </Card>
    </>
  );
}

function Chip({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to} className="glass press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold">
      <Icon name={icon} size={17} className="text-accent" /> {label}
    </Link>
  );
}

// ——————————————————— Detalhe / edição do treino ———————————————————
export function WorkoutDetail() {
  const { id } = useParams();
  const workouts = useWorkouts();
  const exercises = useExercises();
  const equipment = useEquipment();
  const schedule = useSchedule();
  const active = useActiveSession();
  const nav = useNavigate();
  const toast = useUi((s) => s.showToast);
  const [draft, setDraft] = useState<WorkoutTemplate | null>(null);
  const [picker, setPicker] = useState<{ index: number | null } | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});
  const tpl = workouts?.find((w) => w.id === id);
  useEffect(() => {
    if (tpl) setDraft(structuredClone(tpl));
  }, [tpl]);
  useEffect(() => {
    if (!tpl || !exercises || !equipment) return;
    (async () => {
      const out: Record<string, string> = {};
      for (const p of buildPlan(tpl, exercises.map, equipment)) {
        const last = await lastSetsFor(p.ex.id);
        out[p.ex.id] = last.length ? `Última: ${last.map((s) => fmtSet(s.weight, s.reps, p.ex.unit)).join(' · ')}. ${suggestNext(last, p, p.ex.increment).message}` : '';
      }
      setHints(out);
    })();
  }, [tpl, exercises, equipment]);

  if (!draft || !exercises || !equipment || !schedule) return null;
  const plan = buildPlan(draft, exercises.map, equipment);
  const min = estimateWorkoutMin(plan.map((p) => ({ ...p, exerciseId: p.ex.id })), exercises.map);
  const window = planDay(schedule).windowMin;
  const dirty = JSON.stringify(draft) !== JSON.stringify(tpl);
  const upEx = (i: number, patch: Partial<WorkoutTemplate['exercises'][number]>) => setDraft({ ...draft, exercises: draft.exercises.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  const move = (i: number, d: -1 | 1) => {
    const list = [...draft.exercises];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setDraft({ ...draft, exercises: list });
  };

  return (
    <>
      <BackHeader title={`Treino ${draft.id}`} back="/treino" right={dirty ? <Button size="sm" variant="primary" onClick={async () => { await saveWorkout(draft); toast('Treino salvo', 'check'); }}>Salvar</Button> : undefined} />
      <p className="px-1 text-[15px] text-ink-2">{draft.focus}</p>
      <Card className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-ink-3">Tempo estimado</p>
          <p className={cx('tabular text-[22px] font-bold', min > window && 'text-warn')}>~{min} min</p>
        </div>
        <p className={cx('max-w-[55%] text-right text-[13px]', min > window ? 'text-warn' : 'text-ink-3')}>
          {min > window ? `Passa da janela de ${window} min. Reduza séries ou remova um exercício.` : `Cabe na janela de ${window} min (aquecimento e alongamento inclusos).`}
        </p>
      </Card>

      <SectionTitle>Aquecimento</SectionTitle>
      <Card as="div" className="text-[14px] text-ink-2">{draft.warmup}</Card>

      <SectionTitle>Exercícios</SectionTitle>
      <ul className="space-y-3">
        {plan.map((p, i) => (
          <Card key={`${p.originalId}-${i}`} as="li" className="space-y-3">
            <div className="flex gap-3">
              <Link to={`/treino/exercicio/${p.ex.id}`} className="shrink-0" aria-label={`Ver ${p.ex.name}`}>
                <ExerciseAnim ex={p.ex} className="h-20 w-24" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/treino/exercicio/${p.ex.id}`} className="font-semibold leading-tight">{i + 1}. {p.ex.name}</Link>
                <p className="text-[13px] text-ink-3">{p.ex.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</p>
                {p.substituted && <p className="text-[12px] text-warn">Substitui {exercises.map.get(p.originalId)?.name} (sem equipamento)</p>}
                {p.missing && <p className="text-[12px] text-danger">Sem equipamento para este exercício — troque-o.</p>}
                {p.note && <p className="text-[12px] text-ink-3">{p.note}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStep label="Séries" value={p.sets} onChange={(v) => upEx(i, { sets: Math.max(1, v) })} />
              <MiniStep label={p.ex.unit === 's' ? 'Seg. mín' : 'Reps mín'} value={p.repMin} onChange={(v) => upEx(i, { repMin: Math.max(1, v), repMax: Math.max(v, p.repMax) })} />
              <MiniStep label={p.ex.unit === 's' ? 'Seg. máx' : 'Reps máx'} value={p.repMax} onChange={(v) => upEx(i, { repMax: Math.max(p.repMin, v) })} />
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-ink-2">Descanso</span>
              <Stepper label="Descanso" value={p.restSec} step={15} onChange={(v) => upEx(i, { restSec: Math.max(15, v) })} suffix="s" />
            </div>
            {hints[p.ex.id] && <p className="rounded-2xl bg-accent-soft p-2 text-[13px]">{hints[p.ex.id]}</p>}
            <div className="flex justify-between">
              <div className="flex">
                <IconButton icon="down" label="Mover para baixo" onClick={() => move(i, 1)} />
                <IconButton icon="down" label="Mover para cima" className="rotate-180" onClick={() => move(i, -1)} />
              </div>
              <div className="flex">
                <IconButton icon="swap" label="Trocar exercício" onClick={() => setPicker({ index: i })} />
                <IconButton icon="trash" label="Remover" className="text-danger" onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((_, k) => k !== i) })} />
              </div>
            </div>
          </Card>
        ))}
      </ul>
      <Button className="mt-3 w-full" onClick={() => setPicker({ index: null })}><Icon name="plus" size={18} /> Adicionar exercício</Button>

      <SectionTitle>Volta à calma</SectionTitle>
      <Card as="div" className="text-[14px] text-ink-2">{draft.cooldown}</Card>

      <Button
        variant="primary"
        size="lg"
        className="mt-5 w-full"
        disabled={!!active && active.templateId !== draft.id}
        onClick={async () => {
          if (dirty) await saveWorkout(draft);
          await startSession(draft.id);
          nav('/treino/ao-vivo');
        }}
      >
        <Icon name="play" size={20} /> {active?.templateId === draft.id ? 'Continuar treino' : `Iniciar treino ${draft.id}`}
      </Button>
      {active && active.templateId !== draft.id && <p className="mt-2 text-center text-[13px] text-ink-3">Finalize o treino {active.templateId} em andamento primeiro.</p>}

      <ExercisePicker
        open={!!picker}
        current={picker?.index != null ? plan[picker.index].ex : undefined}
        exercises={exercises.list}
        available={equipment}
        onClose={() => setPicker(null)}
        onPick={(ex) => {
          if (picker?.index != null) upEx(picker.index, { exerciseId: ex.id });
          else setDraft({ ...draft, exercises: [...draft.exercises, { exerciseId: ex.id, sets: 3, repMin: 8, repMax: 12, restSec: ex.compound ? 90 : 60 }] });
          setPicker(null);
        }}
      />
    </>
  );
}

function MiniStep({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="glass rounded-2xl py-1">
      <p className="text-[11px] text-ink-3">{label}</p>
      <div className="flex items-center justify-center">
        <button type="button" className="press h-10 w-9 text-[20px] text-accent" aria-label={`Diminuir ${label}`} onClick={() => onChange(value - 1)}>−</button>
        <span className="tabular w-8 text-[18px] font-bold">{value}</span>
        <button type="button" className="press h-10 w-9 text-[20px] text-accent" aria-label={`Aumentar ${label}`} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

export function ExercisePicker({ open, current, exercises, available, onPick, onClose }: { open: boolean; current?: Exercise; exercises: Exercise[]; available: EquipmentId[]; onPick: (e: Exercise) => void; onClose: () => void }) {
  const list = current ? swapOptions(current, exercises, available) : exercises.filter((e) => canDo(e, available));
  return (
    <Sheet open={open} onClose={onClose} title={current ? `Trocar ${current.name}` : 'Adicionar exercício'}>
      {current && <p className="mb-2 text-[13px] text-ink-3">Alternativas que trabalham o mesmo músculo e usam seus equipamentos:</p>}
      <ul className="pb-4">
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onPick(e)} className="press flex w-full items-center gap-3 border-b border-[color:var(--glass-edge)] py-2 text-left">
              <ExerciseAnim ex={e} className="h-12 w-14 shrink-0" still />
              <span className="min-w-0">
                <span className="block font-medium">{e.name}</span>
                <span className="text-[12px] text-ink-3">{e.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</span>
              </span>
            </button>
          </li>
        ))}
        {!list.length && <p className="py-6 text-center text-ink-3">Nenhuma alternativa com os equipamentos marcados.</p>}
      </ul>
    </Sheet>
  );
}

// ——————————————————— Exercício ———————————————————
export function ExerciseDetail() {
  const { id } = useParams();
  const exercises = useExercises();
  const sets = useAllSets();
  const equipment = useEquipment();
  const ex = exercises?.map.get(id ?? '');
  if (!ex || !sets || !equipment) return null;
  const mine = sets.filter((s) => s.exerciseId === ex.id);
  const rec = computeRecord(mine);
  return (
    <>
      <BackHeader title={ex.name} back="/treino/biblioteca" />
      <ExerciseAnim ex={ex} className="aspect-[4/3] w-full" />
      <p className="mt-1 text-right text-[11px] text-ink-3">Imagens: free-exercise-db (domínio público)</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ex.primary.map((m) => <span key={m} className="rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent">{MUSCLE_LABEL[m]}</span>)}
        {ex.secondary.map((m) => <span key={m} className="glass rounded-full px-3 py-1 text-[13px]">{MUSCLE_LABEL[m]}</span>)}
      </div>
      {!canDo(ex, equipment) && <p className="mt-2 text-[14px] text-warn">Precisa de equipamento que não está marcado na sua academia.</p>}

      {mine.length > 0 && (
        <Card className="mt-3 grid grid-cols-3 text-center">
          <Stat label="Carga máx." value={`${fmt(rec.maxWeight)} kg`} />
          <Stat label="1RM estimado" value={`${Math.round(rec.best1RM)} kg`} />
          <Stat label="Séries" value={String(mine.length)} />
        </Card>
      )}

      <SectionTitle>Como fazer</SectionTitle>
      <Card as="div">
        <ol className="space-y-2">
          {ex.steps.map((s, i) => (
            <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-ink">{i + 1}</span><span>{s}</span></li>
          ))}
        </ol>
      </Card>
      <SectionTitle>Erros comuns</SectionTitle>
      <Card as="div">
        <ul className="space-y-1">{ex.mistakes.map((m) => <li key={m} className="flex gap-2"><span className="text-danger"><Icon name="x" size={18} /></span>{m}</li>)}</ul>
      </Card>
      <SectionTitle>Segurança</SectionTitle>
      <Card as="div" className="flex gap-2"><span className="text-warn"><Icon name="info" /></span>{ex.safety}</Card>
      {ex.alternatives.length > 0 && (
        <>
          <SectionTitle>Alternativas</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {ex.alternatives.map((a) => exercises?.map.get(a)).filter(Boolean).map((a) => (
              <Link key={a!.id} to={`/treino/exercicio/${a!.id}`} className="glass press rounded-full px-3 py-2 text-[14px]">{a!.name}</Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tabular text-[20px] font-bold">{value}</p>
      <p className="text-[12px] text-ink-3">{label}</p>
    </div>
  );
}

// ——————————————————— Biblioteca ———————————————————
export function Library() {
  const exercises = useExercises();
  const equipment = useEquipment();
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    if (!exercises) return [];
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const filtered = exercises.list.filter((e) => norm(e.name).includes(norm(q)));
    const by = new Map<string, Exercise[]>();
    filtered.forEach((e) => by.set(e.primary[0], [...(by.get(e.primary[0]) ?? []), e]));
    return [...by.entries()];
  }, [exercises, q]);
  if (!equipment) return null;
  return (
    <>
      <BackHeader title="Exercícios" back="/treino" />
      <input placeholder="Buscar exercício…" className="glass mb-1 min-h-11 w-full rounded-2xl px-3 outline-none" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar exercício" />
      {groups.map(([m, list]) => (
        <div key={m}>
          <SectionTitle>{MUSCLE_LABEL[m]}</SectionTitle>
          <Card className="p-0" as="div">
            <ul>
              {list.map((e, i) => (
                <li key={e.id} className={cx(i > 0 && 'border-t border-[color:var(--glass-edge)]')}>
                  <Link to={`/treino/exercicio/${e.id}`} className={cx('press flex items-center gap-3 px-3 py-2', !canDo(e, equipment) && 'opacity-50')}>
                    <ExerciseAnim ex={e} className="h-12 w-14 shrink-0" still />
                    <span className="flex-1 font-medium">{e.name}</span>
                    {!canDo(e, equipment) && <span className="text-[11px] text-ink-3">sem equip.</span>}
                    <Icon name="right" size={18} className="text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ))}
    </>
  );
}

// ——————————————————— Equipamentos ———————————————————
export function Equipment() {
  const equipment = useEquipment();
  if (!equipment) return null;
  const toggle = (id: EquipmentId) => setEquipment(equipment.includes(id) ? equipment.filter((x) => x !== id) : [...equipment, id]);
  return (
    <>
      <BackHeader title="Equipamentos disponíveis" back="/treino" />
      <p className="mb-3 px-1 text-[14px] text-ink-3">Marque o que existe na sua academia. Exercícios sem equipamento são trocados automaticamente por uma alternativa.</p>
      <Card className="p-0" as="div">
        <ul>
          {EQUIPMENT.map((e, i) => (
            <li key={e.id} className={cx(i > 0 && 'border-t border-[color:var(--glass-edge)]')}>
              <label className="flex min-h-12 items-center gap-3 px-4">
                <input type="checkbox" className="h-5 w-5 accent-[color:var(--accent)]" checked={equipment.includes(e.id)} onChange={() => toggle(e.id)} />
                <span className="flex-1">{e.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

// ——————————————————— Histórico ———————————————————
export function History() {
  const sessions = useSessions();
  const workouts = useWorkouts();
  if (!sessions || !workouts) return null;
  return (
    <>
      <BackHeader title="Histórico de treinos" back="/treino" />
      {!sessions.length && <Card className="text-center text-ink-3">Nenhum treino registrado ainda.</Card>}
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link to={`/treino/resumo/${s.id}`} className="glass press flex items-center gap-3 rounded-[22px] p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft font-bold text-accent">{s.templateId}</span>
              <div className="flex-1">
                <p className="font-semibold">{formatDateBR(s.date, { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                <p className="tabular text-[13px] text-ink-3">{s.durationMin} min · {(s.volumeKg ?? 0).toLocaleString('pt-BR')} kg de volume{s.deload ? ' · deload' : ''}</p>
              </div>
              {!!s.prs?.length && <span title="Recordes">🏆 {s.prs.length}</span>}
              <Icon name="right" size={18} className="text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
