import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BackHeader, Bar, Button, Card, IconButton, SectionTitle, Sheet, cx } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ExerciseAnim } from '@/components/ExerciseAnim';
import { useEquipment, useExercises, useProfile, useSchedule, useSessionSets, useWorkouts } from '@/db/hooks';
import { activeSession, deleteSet, discardSession, finishSession, lastSetsFor, logSet, startSession, updateSession } from '@/db/repo';
import { db } from '@/db/db';
import type { SetLog, WorkoutId } from '@/db/types';
import { deloadAdjust, suggestNext, type Suggestion } from '@/domain/progression';
import { planDay, workoutForDate } from '@/domain/planner';
import { estimateWorkoutMin } from '@/domain/workoutTime';
import { addMin, formatDuration, isoDate, toHhmm } from '@/domain/time';
import { MUSCLE_LABEL } from '@/seed/exercises';
import { useUi } from '@/store';
import { buildPlan, fmtSet } from './plan';
import { ExercisePicker } from './Workout';

const PR_LABEL: Record<string, string> = { carga: 'carga', '1rm': '1RM estimado', volume: 'volume na série' };

export function LiveWorkout() {
  const wrap = useLiveQuery(async () => ({ s: (await activeSession()) ?? null }));
  const session = wrap?.s;
  const workouts = useWorkouts();
  const exercises = useExercises();
  const equipment = useEquipment();
  const schedule = useSchedule();
  const sets = useSessionSets(session?.id);
  const nav = useNavigate();
  const toast = useUi((s) => s.showToast);

  const [idx, setIdx] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { weight: number; reps: number }>>({});
  const [history, setHistory] = useState<Record<string, { last: SetLog[]; sug: Suggestion }>>({});
  const [restInfo, setRestInfo] = useState<{ sec: number; at: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const [swap, setSwap] = useState(false);

  const tpl = workouts?.find((w) => w.id === session?.templateId);
  const plan = useMemo(() => (tpl && exercises && equipment && session ? buildPlan(tpl, exercises.map, equipment, session) : []), [tpl, exercises, equipment, session]);

  // Histórico + sugestão de carga para cada exercício do treino
  useEffect(() => {
    if (!plan.length || !session) return;
    (async () => {
      const out: typeof history = {};
      for (const p of plan) {
        const last = await lastSetsFor(p.ex.id, session.id);
        out[p.ex.id] = { last, sug: suggestNext(last, p, p.ex.increment) };
      }
      setHistory(out);
    })();
  }, [plan, session]);

  // Começa no primeiro exercício com séries pendentes
  useEffect(() => {
    if (idx !== null || !plan.length || !sets) return;
    const first = plan.findIndex((p) => sets.filter((s) => s.exerciseId === p.ex.id).length < p.sets);
    setIdx(first === -1 ? plan.length - 1 : first);
  }, [plan, sets, idx]);

  if (wrap && !session) return <Navigate to="/treino" replace />;
  if (!session || !tpl || !sets || idx === null || !plan[idx] || !schedule || !exercises || !equipment) return null;

  const cur = plan[idx];
  const curSets = sets.filter((s) => s.exerciseId === cur.ex.id);
  const doneTotal = plan.reduce((n, p) => n + Math.min(p.sets, sets.filter((s) => s.exerciseId === p.ex.id).length), 0);
  const totalSets = plan.reduce((n, p) => n + p.sets, 0);
  const h = history[cur.ex.id];
  const nextSetIndex = Array.from({ length: cur.sets }, (_, i) => i).find((i) => !curSets.some((s) => s.setIndex === i));
  const startHhmm = toHhmm(new Date(session.startedAt).getHours() * 60 + new Date(session.startedAt).getMinutes());
  const est = estimateWorkoutMin(plan.map((p) => ({ ...p, exerciseId: p.ex.id })), exercises.map);
  const dayPlan = planDay(schedule);

  function valueFor(i: number) {
    const key = `${cur.ex.id}|${i}`;
    if (drafts[key]) return drafts[key];
    const logged = curSets.find((s) => s.setIndex === i);
    if (logged) return { weight: logged.weight, reps: logged.reps };
    const lastSame = h?.last.find((s) => s.setIndex === i) ?? h?.last.at(-1);
    let weight = h?.sug.weight || lastSame?.weight || 0;
    if (session!.deload) weight = deloadAdjust(1, weight).weight;
    const reps = h?.sug.action === 'keep' || h?.sug.action === 'increase' ? h.sug.reps : cur.repMin;
    return { weight, reps };
  }
  const setDraft = (i: number, patch: Partial<{ weight: number; reps: number }>) => setDrafts((d) => ({ ...d, [`${cur.ex.id}|${i}`]: { ...valueFor(i), ...patch } }));

  async function complete(i: number) {
    const v = valueFor(i);
    const logged = curSets.find((s) => s.setIndex === i);
    if (logged && logged.weight === v.weight && logged.reps === v.reps) {
      await deleteSet(logged.id);
      return;
    }
    const prs = await logSet(session!.id, cur.ex.id, i, v.weight, v.reps);
    if (prs.length) toast(`🏆 Recorde de ${prs.map((p) => PR_LABEL[p]).join(' e ')}!`);
    const isLastSet = curSets.length + (logged ? 0 : 1) >= cur.sets;
    setRestInfo(isLastSet ? null : { sec: cur.restSec, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
  }

  async function finish() {
    const done = await finishSession(session!.id);
    nav(`/treino/resumo/${done!.id}`, { replace: true });
  }

  const goto = (n: number) => {
    setIdx(Math.max(0, Math.min(plan.length - 1, n)));
    setRestInfo(null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <header className="pt-safe flex items-center gap-2 pb-2">
        <IconButton icon="x" label="Opções do treino" className="glass" onClick={() => setMenu(true)} />
        <div className="min-w-0 flex-1 text-center">
          <p className="font-bold">{tpl.name}{session.deload ? ' · deload' : ''}</p>
          <p className="tabular text-[12px] text-ink-3">Início {startHhmm} · previsto até {addMin(startHhmm, est)} · limite {dayPlan.gymDeadline}</p>
        </div>
        <span className="tabular w-11 text-right text-[13px] font-semibold text-ink-3">{idx + 1}/{plan.length}</span>
      </header>
      <Bar value={doneTotal / totalSets} />

      <div key={cur.ex.id} className="fade-up flex-1 pt-3 pb-40">
        <ExerciseAnim ex={cur.ex} className="aspect-[16/10] w-full" />
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight font-bold">{cur.ex.name}</h1>
            <p className="text-[14px] text-ink-3">
              {cur.sets} × {cur.repMin}–{cur.repMax}{cur.ex.unit === 's' ? ' s' : ' reps'} · {cur.ex.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}
              {cur.ex.perSide ? ' · por lado' : ''}
            </p>
          </div>
          <div className="flex shrink-0">
            <IconButton icon="info" label="Como fazer" className="glass" onClick={() => setHowTo(true)} />
            <IconButton icon="swap" label="Trocar exercício" className="glass ml-1" onClick={() => setSwap(true)} />
          </div>
        </div>

        {h && (
          <p className="mt-2 rounded-2xl bg-accent-soft p-3 text-[14px]">
            {h.last.length ? <><b>Última vez:</b> {h.last.map((s) => fmtSet(s.weight, s.reps, cur.ex.unit)).join(' · ')}<br /></> : null}
            {h.sug.message}
          </p>
        )}

        <ul className="mt-3 space-y-2" aria-label="Séries">
          {Array.from({ length: cur.sets }, (_, i) => {
            const v = valueFor(i);
            const logged = curSets.find((s) => s.setIndex === i);
            const isNext = i === nextSetIndex;
            return (
              <li key={i} className={cx('glass rounded-[22px] px-2 py-2.5 transition-colors', isNext && 'ring-2 ring-[color:var(--accent)]', logged && 'opacity-75')}>
                <div className="flex items-center gap-1.5">
                  <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold', logged ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent')}>{i + 1}</span>
                  {cur.ex.increment > 0 || v.weight > 0 ? (
                    <NumBox label="kg" value={v.weight} step={cur.ex.increment || 1} onChange={(n) => setDraft(i, { weight: n })} />
                  ) : (
                    <span className="flex-1 text-center text-[13px] text-ink-3">peso corporal</span>
                  )}
                  <NumBox label={cur.ex.unit === 's' ? 's' : 'reps'} value={v.reps} step={1} onChange={(n) => setDraft(i, { reps: n })} />
                  <button
                    type="button"
                    onClick={() => complete(i)}
                    aria-label={logged ? `Série ${i + 1} concluída — toque para desfazer` : `Concluir série ${i + 1}`}
                    aria-pressed={!!logged}
                    className={cx('press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', logged ? 'bg-ok text-white' : 'bg-accent text-accent-ink')}
                  >
                    <Icon name="check" size={26} strokeWidth={2.5} className={logged ? 'pop' : ''} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {restInfo && (
          <Card className="fade-up mt-3 flex items-center gap-3" as="div">
            <span className="text-accent"><Icon name="clock" size={26} /></span>
            <p><b>Descanso: {restInfo.sec} s</b> <span className="text-ink-3">(série concluída às {restInfo.at})</span></p>
          </Card>
        )}
        {nextSetIndex === undefined && idx < plan.length - 1 && (
          <p className="mt-3 text-center text-[14px] font-semibold text-ok">Exercício concluído. Vá para o próximo →</p>
        )}
        {cur.note && <p className="mt-3 text-[13px] text-ink-3">{cur.note}</p>}
      </div>

      <nav className="pb-safe glass fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] px-4 pt-3" aria-label="Navegação do treino">
        <div className="mx-auto flex max-w-xl gap-3">
          <Button size="lg" onClick={() => goto(idx - 1)} disabled={idx === 0} aria-label="Exercício anterior"><Icon name="left" /></Button>
          {idx < plan.length - 1 ? (
            <Button size="lg" variant={nextSetIndex === undefined ? 'primary' : 'glass'} className="min-w-0 flex-1" onClick={() => goto(idx + 1)}>
              <span className="min-w-0 truncate">Próximo: {plan[idx + 1].ex.name}</span> <Icon name="right" size={20} className="shrink-0" />
            </Button>
          ) : (
            <Button size="lg" variant="primary" className="flex-1" onClick={finish}><Icon name="check" size={20} /> Finalizar treino</Button>
          )}
        </div>
      </nav>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Treino em andamento">
        <div className="space-y-2 pb-4">
          <p className="text-[14px] text-ink-3">{doneTotal} de {totalSets} séries feitas.</p>
          <Button size="lg" variant="primary" className="w-full" onClick={finish}>Finalizar e salvar agora</Button>
          <Button size="lg" className="w-full" onClick={() => nav('/')}>Sair (continuar depois)</Button>
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={async () => {
              if (confirm('Descartar este treino? As séries registradas serão apagadas.')) {
                await discardSession(session.id);
                nav('/treino', { replace: true });
              }
            }}
          >
            Descartar treino
          </Button>
        </div>
      </Sheet>

      <Sheet open={howTo} onClose={() => setHowTo(false)} title={cur.ex.name}>
        <ol className="space-y-2 pb-2">
          {cur.ex.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="font-bold text-accent">{i + 1}.</span>{s}</li>)}
        </ol>
        <p className="mt-2 text-[14px]"><b>Evite:</b> {cur.ex.mistakes.join('; ')}.</p>
        <p className="mt-2 mb-4 text-[14px] text-warn">{cur.ex.safety}</p>
      </Sheet>

      <ExercisePicker
        open={swap}
        current={cur.ex}
        exercises={exercises.list}
        available={equipment}
        onClose={() => setSwap(false)}
        onPick={async (e) => {
          await updateSession({ ...session, swaps: { ...(session.swaps ?? {}), [cur.originalId]: e.id } });
          setSwap(false);
        }}
      />
    </div>
  );
}

function NumBox({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center">
      <button type="button" className="press h-12 w-8 shrink-0 text-[22px] text-accent" aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}>−</button>
      <label className="flex flex-col items-center">
        <input
          inputMode="decimal"
          className="tabular w-11 bg-transparent text-center text-[20px] font-bold outline-none"
          value={String(value).replace('.', ',')}
          aria-label={label}
          onChange={(e) => {
            const n = parseFloat(e.target.value.replace(',', '.'));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          onFocus={(e) => e.target.select()}
        />
        <span className="-mt-1 text-[11px] text-ink-3">{label}</span>
      </label>
      <button type="button" className="press h-12 w-8 shrink-0 text-[22px] text-accent" aria-label={`Aumentar ${label}`} onClick={() => onChange(+(value + step).toFixed(2))}>+</button>
    </div>
  );
}

// ——————————————————— Resumo ———————————————————
export function SessionSummary() {
  const { id } = useParams();
  const session = useLiveQuery(() => db.sessions.get(id ?? ''), [id]);
  const sets = useSessionSets(id);
  const exercises = useExercises();
  if (!session || !sets || !exercises) return null;
  const byEx = new Map<string, SetLog[]>();
  [...sets].sort((a, b) => a.at.localeCompare(b.at)).forEach((s) => byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]));
  return (
    <>
      <BackHeader title="Resumo do treino" back="/treino/historico" />
      <Card className="text-center">
        <p className="text-[40px]">{session.prs?.length ? '🏆' : '💪'}</p>
        <p className="text-[22px] font-bold">Treino {session.templateId} concluído</p>
        <p className="text-ink-3">{new Date(session.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="tabular mt-3 grid grid-cols-3 gap-2">
          <div><p className="text-[22px] font-bold">{formatDuration(session.durationMin ?? 0)}</p><p className="text-[12px] text-ink-3">Duração</p></div>
          <div><p className="text-[22px] font-bold">{(session.volumeKg ?? 0).toLocaleString('pt-BR')}</p><p className="text-[12px] text-ink-3">kg de volume</p></div>
          <div><p className="text-[22px] font-bold">{sets.length}</p><p className="text-[12px] text-ink-3">Séries</p></div>
        </div>
      </Card>
      {!!session.prs?.length && (
        <>
          <SectionTitle>Recordes pessoais</SectionTitle>
          <Card as="div">
            <ul className="space-y-1">{session.prs.map((p) => <li key={p}>🏆 {exercises.map.get(p)?.name}</li>)}</ul>
          </Card>
        </>
      )}
      <SectionTitle>Séries</SectionTitle>
      <ul className="space-y-2">
        {[...byEx.entries()].map(([exId, list]) => {
          const ex = exercises.map.get(exId);
          return (
            <Card key={exId} as="li">
              <Link to={`/treino/exercicio/${exId}`} className="font-semibold">{ex?.name}</Link>
              <p className="tabular text-[14px] text-ink-2">{list.map((s) => fmtSet(s.weight, s.reps, ex?.unit)).join(' · ')}</p>
            </Card>
          );
        })}
      </ul>
      <Link to="/" className="mt-5 block"><Button variant="primary" size="lg" className="w-full">Voltar para Hoje</Button></Link>
      <p className="mt-3 text-center text-[13px] text-ink-3">Agora: pós-treino com proteína + carboidrato. Volume = soma de carga × repetições.</p>
    </>
  );
}

/** Atalho do ícone: inicia (ou continua) o treino do dia. */
export function TodayShortcut() {
  const profile = useProfile();
  const schedule = useSchedule();
  const nav = useNavigate();
  useEffect(() => {
    if (!profile || !schedule) return;
    (async () => {
      const active = await activeSession();
      if (active) return nav('/treino/ao-vivo', { replace: true });
      const id = workoutForDate(isoDate(), profile.programStart, schedule.trainingDays) as WorkoutId | null;
      if (!id) return nav('/treino', { replace: true });
      await startSession(id);
      nav('/treino/ao-vivo', { replace: true });
    })();
  }, [profile, schedule, nav]);
  return null;
}
