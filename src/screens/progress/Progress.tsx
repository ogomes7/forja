import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackHeader, Bar, Button, Card, Field, IconButton, PageHeader, SectionTitle, Segmented, Sheet, cx, inputCls } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { PeriodFilter, TrendChart, filterPeriod, type Period, type SeriesPoint } from '@/components/charts';
import {
  useAllMealLogs, useAllMeals, useAllSets, useCheckins, useExercises, useGoals, useMetrics, usePhotos, useProfile, useSchedule, useSessions,
} from '@/db/hooks';
import { addPhoto, deleteGoal, deleteMetric, deletePhoto, saveCheckin, saveGoal, saveMetric, saveProfile, scaleWeekToTarget, targetsFor } from '@/db/repo';
import type { BodyMetric, GoalItem, MeasureKey, PhotoPose } from '@/db/types';
import { GAIN_RANGE, PACE_LABEL, classifyGainPace, weeklySlope } from '@/domain/nutrition';
import { analyzeCheckin } from '@/domain/checkin';
import { workoutForDate } from '@/domain/planner';
import { computeRecord, epley1RM, fmt } from '@/domain/progression';
import { addDays, daysBetween, formatDateBR, isoDate, parseIso, weekStart } from '@/domain/time';
import { useUi } from '@/store';

export const MEASURES: { key: MeasureKey; label: string }[] = [
  { key: 'chest', label: 'Peitoral' },
  { key: 'waist', label: 'Cintura' },
  { key: 'abdomen', label: 'Abdômen' },
  { key: 'hips', label: 'Quadril' },
  { key: 'armR', label: 'Braço D' },
  { key: 'armL', label: 'Braço E' },
  { key: 'thighR', label: 'Coxa D' },
  { key: 'thighL', label: 'Coxa E' },
  { key: 'calf', label: 'Panturrilha' },
];
const n1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const signed = (n: number) => `${n > 0 ? '+' : ''}${n1(n)}`;

/** Série de peso com média móvel de 7 dias e faixa-alvo de ganho semanal. */
function weightSeries(metrics: BodyMetric[], withBand: boolean): SeriesPoint[] {
  const list = metrics.filter((m) => m.weight);
  if (!list.length) return [];
  const pts = list.map((m) => {
    const win = list.filter((x) => x.date <= m.date && daysBetween(x.date, m.date) < 7);
    return { t: parseIso(m.date).getTime(), date: m.date, value: m.weight, avg: win.reduce((s, x) => s + x.weight!, 0) / win.length } as SeriesPoint;
  });
  if (withBand) {
    const w0 = pts[0].avg!;
    pts.forEach((p) => {
      const wk = daysBetween(pts[0].date, p.date) / 7;
      p.band = [w0 + GAIN_RANGE.min * wk, w0 + GAIN_RANGE.max * wk];
    });
  }
  return pts;
}

// ——————————————————— Visão geral ———————————————————
export function ProgressHome() {
  const metrics = useMetrics();
  const profile = useProfile();
  const [period, setPeriod] = useState<Period>('90');
  const [recording, setRecording] = useState(false);
  if (!metrics || !profile) return null;

  const weights = metrics.filter((m) => m.weight);
  const latest = weights.at(-1);
  const today = isoDate();
  const recent = weights.filter((m) => daysBetween(m.date, today) <= 21);
  const span = recent.length ? daysBetween(recent[0].date, recent.at(-1)!.date) : 0;
  const pace = span >= 10 ? weeklySlope(recent.map((m) => ({ day: daysBetween(today, m.date), weight: m.weight! }))) : null;
  const series = weightSeries(filterPeriod(weights, period), profile.goal === 'gain');
  const first = weights[0];

  return (
    <>
      <PageHeader title="Evolução" right={<Button variant="primary" onClick={() => setRecording(true)}><Icon name="plus" size={18} /> Registrar</Button>} />

      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px] text-ink-3">Peso atual</p>
            <p className="tabular text-[34px] leading-none font-bold">{latest ? n1(latest.weight!) : '—'} <span className="text-[16px] text-ink-3">kg</span></p>
          </div>
          <div className="text-right">
            {first && latest && first !== latest && <p className="tabular text-[14px]">{signed(latest.weight! - first.weight!)} kg desde {formatDateBR(first.date)}</p>}
            {pace !== null ? (
              <p className={cx('tabular text-[14px] font-semibold', ['ideal', 'lento'].includes(classifyGainPace(pace)) ? 'text-ok' : 'text-warn')}>
                {signed(pace)} kg/sem · {PACE_LABEL[classifyGainPace(pace)]}
              </p>
            ) : (
              <p className="text-[13px] text-ink-3">Ritmo após ~2 semanas de pesagens</p>
            )}
          </div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
        <TrendChart data={series} unit="kg" label="Curva de peso" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" /> Média móvel 7 dias</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--text-3)]/60" /> Pesagens</span>
          {profile.goal === 'gain' && <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-accent-soft" /> Meta 0,25–0,5 kg/sem</span>}
        </div>
      </Card>

      <nav className="mt-3 grid grid-cols-3 gap-2" aria-label="Seções da evolução">
        <Tile to="/evolucao/medidas" icon="ruler" label="Medidas" />
        <Tile to="/evolucao/cargas" icon="dumbbell" label="Cargas" />
        <Tile to="/evolucao/fotos" icon="camera" label="Fotos" />
        <Tile to="/evolucao/checkin" icon="sparkle" label="Check-in" />
        <Tile to="/evolucao/metas" icon="target" label="Metas" />
        <Tile to="/evolucao/historico" icon="list" label="Registros" />
      </nav>

      <Consistency />
      <RecordSheet open={recording} onClose={() => setRecording(false)} />
    </>
  );
}

function Tile({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to} className="glass press flex min-h-20 flex-col items-center justify-center gap-1 rounded-[22px] text-[14px] font-semibold">
      <span className="text-accent"><Icon name={icon} size={24} /></span>
      {label}
    </Link>
  );
}

// ——————————————————— Consistência ———————————————————
function Consistency() {
  const profile = useProfile();
  const schedule = useSchedule();
  const sessions = useSessions();
  const meals = useAllMeals();
  const logs = useAllMealLogs();
  const data = useMemo(() => {
    if (!profile || !schedule || !sessions || !meals || !logs) return null;
    const today = isoDate();
    const trainedDates = new Set(sessions.map((s) => s.date));
    const perWeekday = new Map<number, number>();
    meals.forEach((m) => perWeekday.set(m.weekday, (perWeekday.get(m.weekday) ?? 0) + 1));
    const doneByDate = new Map<string, number>();
    logs.filter((l) => l.done).forEach((l) => doneByDate.set(l.date, (doneByDate.get(l.date) ?? 0) + 1));
    const isTraining = (d: string) => !!workoutForDate(d, profile.programStart, schedule.trainingDays);
    const mealRatio = (d: string) => Math.min(1, (doneByDate.get(d) ?? 0) / (perWeekday.get(parseIso(d).getDay()) || 1));

    // Sequência: treinos programados cumpridos em sequência (descanso não quebra).
    let streak = 0;
    for (let d = today; d >= profile.programStart; d = addDays(d, -1)) {
      if (trainedDates.has(d)) streak++;
      else if (isTraining(d) && d !== today) break;
    }
    const ws = weekStart(today);
    const days: string[] = [];
    for (let d = ws > profile.programStart ? ws : profile.programStart; d <= today; d = addDays(d, 1)) days.push(d);
    const planned = days.filter(isTraining).length;
    const done = days.filter((d) => trainedDates.has(d)).length;
    const dietDays = days.filter((d) => d < today || doneByDate.has(d));
    const diet = dietDays.length ? dietDays.reduce((s, d) => s + mealRatio(d), 0) / dietDays.length : 0;

    // Calendário: 12 semanas, colunas = semanas, linhas = Seg..Dom
    const start = addDays(weekStart(today), -77);
    const cells = Array.from({ length: 84 }, (_, i) => {
      const d = addDays(start, i);
      return { d, future: d > today, before: d < profile.programStart, ratio: mealRatio(d), trained: trainedDates.has(d) };
    });
    return { streak, planned, done, diet, cells };
  }, [profile, schedule, sessions, meals, logs]);
  if (!data) return null;

  return (
    <>
      <SectionTitle>Consistência</SectionTitle>
      <Card className="space-y-4">
        <div className="tabular grid grid-cols-3 text-center">
          <div><p className="text-[24px] font-bold">{data.streak}</p><p className="text-[12px] text-ink-3">treinos seguidos</p></div>
          <div><p className="text-[24px] font-bold">{data.done}/{data.planned || 0}</p><p className="text-[12px] text-ink-3">treinos na semana</p></div>
          <div><p className="text-[24px] font-bold">{Math.round(data.diet * 100)}%</p><p className="text-[12px] text-ink-3">dieta na semana</p></div>
        </div>
        <div>
          <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label="Calendário de calor das últimas 12 semanas: cor = refeições marcadas, anel = treino feito">
            {data.cells.map((c) => (
              <div
                key={c.d}
                title={`${formatDateBR(c.d)}: ${Math.round(c.ratio * 100)}% refeições${c.trained ? ' · treino' : ''}`}
                className={cx('aspect-square rounded-[4px]', c.trained && 'ring-2 ring-[color:var(--accent)] ring-inset')}
                style={{ background: c.future || c.before ? 'transparent' : c.ratio > 0 ? `color-mix(in srgb, var(--accent) ${20 + c.ratio * 80}%, transparent)` : 'color-mix(in srgb, var(--text-3) 15%, transparent)' }}
              />
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Cor = % de refeições marcadas · contorno = dia com treino · descanso não quebra a sequência.</p>
        </div>
      </Card>
    </>
  );
}

// ——————————————————— Registrar peso/medidas ———————————————————
export function RecordSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: BodyMetric }) {
  const toast = useUi((s) => s.showToast);
  const [form, setForm] = useState<Record<string, string>>({});
  const [date, setDate] = useState(isoDate());
  const val = (k: string) => form[k] ?? (initial && (initial as unknown as Record<string, number>)[k] != null ? String((initial as unknown as Record<string, number>)[k]).replace('.', ',') : '');
  const num = (k: string) => {
    const n = parseFloat(val(k).replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };
  return (
    <Sheet open={open} onClose={onClose} title="Registrar">
      <div className="space-y-3 pb-4">
        <Field label="Data"><input type="date" className={inputCls} value={initial?.date ?? date} onChange={(e) => setDate(e.target.value)} disabled={!!initial} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Peso (kg)" hint="Em jejum, após ir ao banheiro"><input inputMode="decimal" className={inputCls} value={val('weight')} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></Field>
          <Field label="% gordura (opcional)"><input inputMode="decimal" className={inputCls} value={val('bodyFat')} onChange={(e) => setForm({ ...form, bodyFat: e.target.value })} /></Field>
        </div>
        <p className="pt-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">Medidas (cm) — opcional</p>
        <div className="grid grid-cols-3 gap-2">
          {MEASURES.map((m) => (
            <Field key={m.key} label={m.label}><input inputMode="decimal" className={inputCls} value={val(m.key)} onChange={(e) => setForm({ ...form, [m.key]: e.target.value })} /></Field>
          ))}
        </div>
        <p className="text-[12px] text-ink-3">Meça sempre no mesmo lugar, relaxado, de manhã. Cintura: na altura do umbigo.</p>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={async () => {
            const d = initial?.date ?? date;
            const m: Omit<BodyMetric, 'id'> = { date: d, weight: num('weight'), bodyFat: num('bodyFat') };
            MEASURES.forEach((x) => ((m as Record<string, unknown>)[x.key] = num(x.key)));
            await saveMetric(m);
            if (m.weight && d >= isoDate(new Date(Date.now() - 3 * 86400000))) await saveProfile({ weightKg: m.weight });
            toast('Registro salvo', 'check');
            setForm({});
            onClose();
          }}
        >
          Salvar
        </Button>
      </div>
    </Sheet>
  );
}

// ——————————————————— Medidas ———————————————————
export function Measures() {
  const metrics = useMetrics();
  const [key, setKey] = useState<MeasureKey>('chest');
  const [period, setPeriod] = useState<Period>('all');
  if (!metrics) return null;
  const has = (k: MeasureKey) => metrics.filter((m) => m[k] != null);
  const list = filterPeriod(has(key), period);
  const series: SeriesPoint[] = list.map((m) => ({ t: parseIso(m.date).getTime(), date: m.date, value: m[key] }));
  return (
    <>
      <BackHeader title="Medidas" back="/evolucao" />
      <Card className="p-0" as="div">
        <ul>
          {MEASURES.map((m, i) => {
            const l = has(m.key);
            const last = l.at(-1)?.[m.key];
            const delta = l.length > 1 ? last! - l[0][m.key]! : null;
            return (
              <li key={m.key} className={cx(i > 0 && 'border-t border-[color:var(--glass-edge)]')}>
                <button type="button" onClick={() => setKey(m.key)} className={cx('press flex min-h-12 w-full items-center gap-3 px-4 text-left', key === m.key && 'bg-accent-soft')} aria-pressed={key === m.key}>
                  <span className="flex-1 font-medium">{m.label}{m.key === 'waist' && <span className="ml-1 text-[12px] text-ink-3">(sob observação)</span>}</span>
                  <span className="tabular">{last != null ? `${n1(last)} cm` : '—'}</span>
                  {delta !== null && <span className={cx('tabular w-14 text-right text-[13px]', m.key === 'waist' ? (delta > 1 ? 'text-warn' : 'text-ink-3') : delta > 0 ? 'text-ok' : 'text-ink-3')}>{signed(delta)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      <SectionTitle>{MEASURES.find((m) => m.key === key)?.label}</SectionTitle>
      <Card className="space-y-3">
        <PeriodFilter value={period} onChange={setPeriod} />
        <TrendChart data={series} unit="cm" label={`Curva de ${MEASURES.find((m) => m.key === key)?.label}`} />
      </Card>
      <p className="mt-3 px-1 text-[13px] text-ink-3">Para ganho de massa: peito, braços e coxas devem subir; a cintura deve subir bem mais devagar.</p>
    </>
  );
}

// ——————————————————— Cargas ———————————————————
type LiftMetric = 'max' | '1rm' | 'volume';
export function Lifts() {
  const sets = useAllSets();
  const exercises = useExercises();
  const sessions = useSessions();
  const [exId, setExId] = useState<string | null>(null);
  const [metric, setMetric] = useState<LiftMetric>('max');
  const [period, setPeriod] = useState<Period>('all');
  if (!sets || !exercises || !sessions) return null;
  const done = new Set(sessions.map((s) => s.id));
  const valid = sets.filter((s) => done.has(s.sessionId));
  const ids = [...new Set(valid.map((s) => s.exerciseId))];
  const current = exId ?? ids[0];
  const mine = valid.filter((s) => s.exerciseId === current);
  const bySession = new Map<string, typeof mine>();
  mine.forEach((s) => bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]));
  const points = [...bySession.values()]
    .map((l) => ({
      date: l[0].date,
      value: metric === 'max' ? Math.max(...l.map((s) => s.weight)) : metric === '1rm' ? Math.max(...l.map((s) => epley1RM(s.weight, s.reps))) : l.reduce((a, s) => a + s.weight * s.reps, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const series = filterPeriod(points, period).map((p) => ({ ...p, t: parseIso(p.date).getTime() }));
  const rec = computeRecord(mine);
  const ex = exercises.map.get(current ?? '');

  return (
    <>
      <BackHeader title="Cargas" back="/evolucao" />
      {!ids.length ? (
        <Card className="text-center text-ink-3">Faça seu primeiro treino para ver a evolução das cargas.</Card>
      ) : (
        <>
          <select className={inputCls} value={current} onChange={(e) => setExId(e.target.value)} aria-label="Exercício">
            {ids.map((id) => <option key={id} value={id}>{exercises.map.get(id)?.name ?? id}</option>)}
          </select>
          <Card className="mt-3 grid grid-cols-3 text-center">
            <div><p className="tabular text-[20px] font-bold">{fmt(rec.maxWeight)} kg</p><p className="text-[12px] text-ink-3">🏆 Carga máx.</p></div>
            <div><p className="tabular text-[20px] font-bold">{Math.round(rec.best1RM)} kg</p><p className="text-[12px] text-ink-3">1RM estimado</p></div>
            <div><p className="tabular text-[20px] font-bold">{bySession.size}</p><p className="text-[12px] text-ink-3">Sessões</p></div>
          </Card>
          <Card className="mt-3 space-y-3">
            <Segmented<LiftMetric> label="Métrica" value={metric} onChange={setMetric} options={[{ value: 'max', label: 'Carga máx.' }, { value: '1rm', label: '1RM est.' }, { value: 'volume', label: 'Volume' }]} />
            <PeriodFilter value={period} onChange={setPeriod} />
            <TrendChart data={series} unit={metric === 'volume' ? 'kg·rep' : 'kg'} label={`${ex?.name}: ${metric}`} />
          </Card>
          <p className="mt-3 px-1 text-[13px] text-ink-3">1RM estimado pela fórmula de Epley (carga × (1 + reps/30)). Não é preciso testar carga máxima.</p>
        </>
      )}
    </>
  );
}

// ——————————————————— Fotos ———————————————————
async function resizeImage(file: File, max = 1080): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82));
}

export function Photos() {
  const photos = usePhotos();
  const [pose, setPose] = useState<PhotoPose>('frente');
  const [sel, setSel] = useState<string[]>([]);
  const urls = useMemo(() => new Map((photos ?? []).map((p) => [p.id, URL.createObjectURL(p.blob)])), [photos]);
  if (!photos) return null;
  const list = photos.filter((p) => p.pose === pose);
  const compare = sel.map((id) => photos.find((p) => p.id === id)).filter(Boolean).sort((a, b) => a!.date.localeCompare(b!.date));

  return (
    <>
      <BackHeader title="Fotos de progresso" back="/evolucao" />
      <Segmented<PhotoPose> label="Posição" value={pose} onChange={(p) => { setPose(p); setSel([]); }} options={[{ value: 'frente', label: 'Frente' }, { value: 'lado', label: 'Lado' }, { value: 'costas', label: 'Costas' }]} />
      <label className="glass press mt-3 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold">
        <Icon name="camera" /> Adicionar foto ({pose})
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await addPhoto(isoDate(), pose, await resizeImage(f));
            e.target.value = '';
          }}
        />
      </label>
      <p className="mt-2 px-1 text-[12px] text-ink-3">As fotos ficam só neste aparelho. Mesma luz, roupa e distância a cada 2–4 semanas.</p>

      {compare.length === 2 && (
        <>
          <SectionTitle>Antes × depois</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {compare.map((p) => (
              <figure key={p!.id} className="glass overflow-hidden rounded-[22px]">
                <img src={urls.get(p!.id)} alt={`Foto ${p!.pose} em ${formatDateBR(p!.date)}`} className="aspect-[3/4] w-full object-cover" />
                <figcaption className="py-1.5 text-center text-[13px] font-semibold">{formatDateBR(p!.date, { day: '2-digit', month: 'short', year: '2-digit' })}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-1 text-center text-[13px] text-ink-3">{daysBetween(compare[0]!.date, compare[1]!.date)} dias de diferença</p>
        </>
      )}

      <SectionTitle>{list.length ? 'Toque em 2 fotos para comparar' : 'Nenhuma foto ainda'}</SectionTitle>
      <ul className="grid grid-cols-3 gap-2">
        {list.map((p) => (
          <li key={p.id} className="relative">
            <button type="button" onClick={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel.slice(-1), p.id])} className={cx('press block w-full overflow-hidden rounded-2xl', sel.includes(p.id) && 'ring-3 ring-[color:var(--accent)]')} aria-pressed={sel.includes(p.id)} aria-label={`Foto de ${formatDateBR(p.date)}`}>
              <img src={urls.get(p.id)} alt="" className="aspect-[3/4] w-full object-cover" />
            </button>
            <span className="tabular absolute bottom-1 left-1 rounded-full bg-black/55 px-2 text-[11px] text-white">{formatDateBR(p.date)}</span>
            <IconButton icon="trash" label="Apagar foto" className="absolute top-0 right-0 text-white drop-shadow" onClick={() => confirm('Apagar esta foto?') && deletePhoto(p.id)} />
          </li>
        ))}
      </ul>
    </>
  );
}

// ——————————————————— Check-in semanal ———————————————————
const FEELINGS = ['😫', '😕', '😐', '🙂', '💪'];

export function CheckinScreen() {
  const metrics = useMetrics();
  const profile = useProfile();
  const checkins = useCheckins();
  const toast = useUi((s) => s.showToast);
  const [feeling, setFeeling] = useState(3);
  const [notes, setNotes] = useState('');
  if (!metrics || !profile || !checkins) return null;
  const today = isoDate();
  const ws = weekStart(today);
  const avg = (from: string, to: string) => {
    const l = metrics.filter((m) => m.weight && m.date >= from && m.date <= to);
    return l.length ? l.reduce((s, m) => s + m.weight!, 0) / l.length : undefined;
  };
  const thisWeek = avg(ws, today);
  const lastWeek = avg(addDays(ws, -7), addDays(ws, -1));
  const a = analyzeCheckin(metrics, today, profile.goal);
  const t = targetsFor(profile);
  const doneThisWeek = checkins.find((c) => c.date === ws);

  return (
    <>
      <BackHeader title="Check-in semanal" back="/evolucao" />
      <Card className="space-y-2">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Semana de {formatDateBR(ws)}</p>
        <div className="tabular grid grid-cols-3 text-center">
          <div><p className="text-[22px] font-bold">{thisWeek ? n1(thisWeek) : '—'}</p><p className="text-[12px] text-ink-3">peso médio</p></div>
          <div><p className="text-[22px] font-bold">{thisWeek && lastWeek ? signed(thisWeek - lastWeek) : '—'}</p><p className="text-[12px] text-ink-3">vs. semana passada</p></div>
          <div><p className="text-[22px] font-bold">{a.pace !== null ? signed(a.pace) : '—'}</p><p className="text-[12px] text-ink-3">kg/sem (tendência)</p></div>
        </div>
      </Card>

      <SectionTitle>Resumo e sugestões</SectionTitle>
      <Card className="space-y-2">
        {a.suggestions.map((s) => <p key={s} className="flex gap-2"><span className="text-accent"><Icon name="sparkle" size={18} /></span>{s}</p>)}
        {a.kcalDelta !== 0 && (
          <Button
            variant="primary"
            className="mt-2 w-full"
            onClick={async () => {
              const surplusKcal = profile.surplusKcal + a.kcalDelta;
              const manual = profile.manualTargets ? { ...profile.manualTargets, kcal: profile.manualTargets.kcal + a.kcalDelta } : undefined;
              await saveProfile({ surplusKcal, manualTargets: manual });
              await scaleWeekToTarget({ ...t, kcal: t.kcal + a.kcalDelta });
              toast(`Meta ajustada em ${signed(a.kcalDelta)} kcal e cardápio atualizado`, 'check');
            }}
          >
            Aplicar {signed(a.kcalDelta)} kcal/dia ({(t.kcal + a.kcalDelta).toLocaleString('pt-BR')} kcal)
          </Button>
        )}
      </Card>

      <SectionTitle>Como você se sentiu?</SectionTitle>
      <Card className="space-y-3">
        <div className="flex justify-between" role="radiogroup" aria-label="Como se sentiu">
          {FEELINGS.map((f, i) => (
            <button key={f} type="button" role="radio" aria-checked={feeling === i + 1} aria-label={`Nota ${i + 1}`} onClick={() => setFeeling(i + 1)} className={cx('press h-12 w-12 rounded-full text-[26px]', feeling === i + 1 ? 'bg-accent-soft ring-2 ring-[color:var(--accent)]' : 'opacity-60')}>{f}</button>
          ))}
        </div>
        <textarea className={cx(inputCls, 'min-h-20 py-2')} placeholder="Energia, sono, fome, dores…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={async () => {
            await saveCheckin({ date: ws, avgWeight: thisWeek, feeling, notes, suggestions: a.suggestions });
            toast('Check-in salvo', 'check');
            setNotes('');
          }}
        >
          {doneThisWeek ? 'Atualizar check-in' : 'Salvar check-in'}
        </Button>
        <Link to="/evolucao" className="block text-center text-[14px] font-semibold text-accent">Registrar medidas desta semana →</Link>
      </Card>

      {checkins.length > 0 && (
        <>
          <SectionTitle>Anteriores</SectionTitle>
          <ul className="space-y-2">
            {checkins.map((c) => (
              <Card key={c.id} as="li" className="text-[14px]">
                <p className="font-semibold">{FEELINGS[c.feeling - 1]} Semana de {formatDateBR(c.date)} {c.avgWeight ? `· ${n1(c.avgWeight)} kg` : ''}</p>
                {c.notes && <p className="text-ink-2">{c.notes}</p>}
                {c.suggestions[0] && <p className="text-ink-3">{c.suggestions[0]}</p>}
              </Card>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ——————————————————— Metas ———————————————————
export function Goals() {
  const goals = useGoals();
  const metrics = useMetrics();
  const sets = useAllSets();
  const exercises = useExercises();
  const profile = useProfile();
  const [editing, setEditing] = useState<Partial<GoalItem> | null>(null);
  if (!goals || !metrics || !sets || !exercises || !profile) return null;

  const current = (g: Pick<GoalItem, 'kind' | 'key'>): number | undefined => {
    if (g.kind === 'weight') return metrics.filter((m) => m.weight).at(-1)?.weight;
    if (g.kind === 'measure') return metrics.filter((m) => m[g.key as MeasureKey] != null).at(-1)?.[g.key as MeasureKey];
    const l = sets.filter((s) => s.exerciseId === g.key);
    return l.length ? Math.max(...l.map((s) => s.weight)) : undefined;
  };
  const unit = (k: GoalItem['kind']) => (k === 'measure' ? 'cm' : 'kg');

  async function suggested() {
    const today = isoDate();
    const w = current({ kind: 'weight' }) ?? profile!.weightKg;
    await saveGoal({ kind: 'weight', title: 'Peso (ganho gradual)', start: w, target: Math.round((w + 4) * 2) / 2, createdAt: today });
    for (const [key, add] of [['armR', 2], ['chest', 4], ['thighR', 3]] as const) {
      const c = current({ kind: 'measure', key });
      if (c) await saveGoal({ kind: 'measure', key, title: MEASURES.find((m) => m.key === key)!.label, start: c, target: c + add, createdAt: today });
    }
    const sp = current({ kind: 'lift', key: 'supino-halteres' });
    if (sp) await saveGoal({ kind: 'lift', key: 'supino-halteres', title: 'Supino com halteres', start: sp, target: sp + 6, createdAt: today });
  }

  return (
    <>
      <BackHeader title="Metas" back="/evolucao" right={<IconButton icon="plus" label="Nova meta" className="glass" onClick={() => setEditing({ kind: 'weight', title: 'Peso', start: current({ kind: 'weight' }) ?? profile.weightKg })} />} />
      {!goals.length && (
        <Card className="space-y-3 text-center">
          <p>Sem metas ainda. Sugestão para ganho de massa: +4 kg de peso em ~3–4 meses, braços, peito e coxas maiores, cargas subindo — com a cintura sob observação.</p>
          <Button variant="primary" onClick={suggested}>Criar metas sugeridas</Button>
        </Card>
      )}
      <ul className="space-y-3">
        {goals.map((g) => {
          const c = current(g) ?? g.start;
          const p = g.target === g.start ? 1 : (c - g.start) / (g.target - g.start);
          return (
            <Card key={g.id} as="li" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{g.title}</p>
                <div className="flex">
                  <IconButton icon="edit" label="Editar meta" onClick={() => setEditing(g)} />
                  <IconButton icon="trash" label="Apagar meta" className="text-danger" onClick={() => confirm('Apagar esta meta?') && deleteGoal(g.id)} />
                </div>
              </div>
              <Bar value={p} color={p >= 1 ? 'var(--ok)' : 'var(--accent)'} />
              <p className="tabular text-[13px] text-ink-3">
                {n1(g.start)} → <b className="text-ink">{n1(c)}</b> / {n1(g.target)} {unit(g.kind)} · {Math.round(Math.max(0, Math.min(1, p)) * 100)}%{p >= 1 ? ' 🎉' : ''}
              </p>
            </Card>
          );
        })}
      </ul>
      {goals.length > 0 && <p className="mt-3 px-1 text-[13px] text-ink-3">A cintura não entra como meta: acompanhe em Medidas para garantir um ganho limpo.</p>}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar meta' : 'Nova meta'}>
        {editing && (
          <div className="space-y-3 pb-4">
            <Segmented<GoalItem['kind']>
              label="Tipo"
              value={editing.kind!}
              onChange={(k) => setEditing({ ...editing, kind: k, key: k === 'measure' ? 'armR' : k === 'lift' ? exercises.list[0].id : undefined, title: k === 'weight' ? 'Peso' : k === 'measure' ? 'Braço D' : exercises.list[0].name, start: current({ kind: k, key: k === 'measure' ? 'armR' : k === 'lift' ? exercises.list[0].id : undefined }) ?? 0 })}
              options={[{ value: 'weight', label: 'Peso' }, { value: 'measure', label: 'Medida' }, { value: 'lift', label: 'Carga' }]}
            />
            {editing.kind !== 'weight' && (
              <select
                className={inputCls}
                value={editing.key}
                aria-label="Item"
                onChange={(e) => {
                  const key = e.target.value;
                  const title = editing.kind === 'measure' ? MEASURES.find((m) => m.key === key)!.label : exercises.map.get(key)!.name;
                  setEditing({ ...editing, key, title, start: current({ kind: editing.kind!, key }) ?? 0 });
                }}
              >
                {editing.kind === 'measure' ? MEASURES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>) : exercises.list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label={`Início (${unit(editing.kind!)})`}><input inputMode="decimal" className={inputCls} value={editing.start ?? ''} onChange={(e) => setEditing({ ...editing, start: parseFloat(e.target.value.replace(',', '.')) || 0 })} /></Field>
              <Field label={`Meta (${unit(editing.kind!)})`}><input inputMode="decimal" className={inputCls} value={editing.target ?? ''} onChange={(e) => setEditing({ ...editing, target: parseFloat(e.target.value.replace(',', '.')) || 0 })} /></Field>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!editing.target}
              onClick={async () => {
                await saveGoal({ ...(editing as GoalItem), createdAt: editing.createdAt ?? isoDate() });
                setEditing(null);
              }}
            >
              Salvar meta
            </Button>
          </div>
        )}
      </Sheet>
    </>
  );
}

// ——————————————————— Registros (lista editável) ———————————————————
export function MetricLog() {
  const metrics = useMetrics();
  const [editing, setEditing] = useState<BodyMetric | null>(null);
  if (!metrics) return null;
  const list = [...metrics].reverse();
  return (
    <>
      <BackHeader title="Registros" back="/evolucao" />
      {!list.length && <Card className="text-center text-ink-3">Nenhum registro.</Card>}
      <Card className="p-0" as="div">
        <ul>
          {list.map((m, i) => (
            <li key={m.id} className={cx('flex items-center gap-2 px-4 py-2', i > 0 && 'border-t border-[color:var(--glass-edge)]')}>
              <button type="button" className="press flex-1 text-left" onClick={() => setEditing(m)}>
                <p className="font-semibold">{formatDateBR(m.date, { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' })}</p>
                <p className="tabular text-[13px] text-ink-3">
                  {[m.weight && `${n1(m.weight)} kg`, m.bodyFat && `${n1(m.bodyFat)}% gord.`, ...MEASURES.filter((x) => m[x.key] != null).map((x) => `${x.label} ${n1(m[x.key]!)}`)].filter(Boolean).join(' · ')}
                </p>
              </button>
              <IconButton icon="trash" label="Apagar registro" className="text-danger" onClick={() => confirm('Apagar este registro?') && deleteMetric(m.id)} />
            </li>
          ))}
        </ul>
      </Card>
      <RecordSheet open={!!editing} initial={editing ?? undefined} onClose={() => setEditing(null)} />
    </>
  );
}
