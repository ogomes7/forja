import { useState } from 'react';
import { Button, Card, Field, Segmented, Stepper, cx, inputCls } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ACTIVITY_FACTORS, GOAL_DEFAULTS, computeTargets } from '@/domain/nutrition';
import { DEFAULT_SCHEDULE, planDay } from '@/domain/planner';
import { WEEKDAYS_SHORT, WEEK_ORDER, isoDate } from '@/domain/time';
import { DEFAULT_PROFILE, generateWeekMenu, saveMetric, saveProfile, saveSchedule, scaleWeekToTarget } from '@/db/repo';
import type { Activity, Experience, Goal, Profile, Schedule, Sex } from '@/db/types';

const STEPS = ['Objetivo', 'Você', 'Rotina', 'Horários', 'Pronto'];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [s, setS] = useState<Schedule>({ id: 'schedule', ...DEFAULT_SCHEDULE });
  const [busy, setBusy] = useState(false);
  const up = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const upS = (patch: Partial<Schedule>) => setS((x) => ({ ...x, ...patch }));
  const t = computeTargets(p);
  const plan = planDay(s);

  async function finish() {
    setBusy(true);
    const today = isoDate();
    await saveProfile({ ...p, onboarded: true, programStart: today });
    await saveSchedule(s, false);
    await generateWeekMenu(s);
    await scaleWeekToTarget(t);
    await saveMetric({ date: today, weight: p.weightKg });
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-8">
      <div className="mt-2 mb-5 flex gap-1.5" aria-label={`Passo ${step + 1} de ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <div key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-[color:var(--text-3)]/25')} />
        ))}
      </div>

      <div key={step} className="fade-up flex-1 space-y-4">
        {step === 0 && (
          <>
            <h1 className="text-[30px] leading-tight font-bold">Bem-vindo à Forja 👋</h1>
            <p className="text-ink-2">Em 1 minuto o app monta sua agenda, dieta e treinos. Tudo fica só no seu iPhone.</p>
            <p className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-ink-3">Qual é o seu objetivo?</p>
            {(['gain', 'maintain', 'cut'] as Goal[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => up({ goal: g, ...GOAL_DEFAULTS[g] })}
                className={cx('glass press flex w-full items-center justify-between rounded-[22px] p-4 text-left', p.goal === g && 'ring-2 ring-[color:var(--accent)]')}
                aria-pressed={p.goal === g}
              >
                <span>
                  <span className="block font-semibold">{GOAL_DEFAULTS[g].label}</span>
                  <span className="text-[14px] text-ink-3">
                    {g === 'gain' ? 'Superávit moderado, ganho magro de 0,25–0,5 kg/semana' : g === 'maintain' ? 'Manter o peso e ganhar força' : 'Déficit moderado preservando massa'}
                  </span>
                </span>
                {p.goal === g && <Icon name="check" className="text-accent" />}
              </button>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-[28px] font-bold">Sobre você</h1>
            <Field label="Nome (opcional)">
              <input className={inputCls} value={p.name} onChange={(e) => up({ name: e.target.value })} autoComplete="given-name" />
            </Field>
            <Field label="Sexo (para o cálculo do metabolismo)">
              <Segmented<Sex> label="Sexo" value={p.sex} onChange={(v) => up({ sex: v })} options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} />
            </Field>
            <Card className="space-y-3">
              <Row label="Idade"><Stepper label="Idade" value={p.age} onChange={(v) => up({ age: Math.round(v) })} suffix="anos" /></Row>
              <Row label="Altura"><Stepper label="Altura" value={p.heightCm} onChange={(v) => up({ heightCm: v })} suffix="cm" /></Row>
              <Row label="Peso"><Stepper label="Peso" value={p.weightKg} step={0.5} onChange={(v) => up({ weightKg: v })} suffix="kg" /></Row>
            </Card>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[28px] font-bold">Sua rotina</h1>
            <Field label="Experiência na musculação">
              <Segmented<Experience> label="Experiência" value={p.experience} onChange={(v) => up({ experience: v })} options={[{ value: 'beginner', label: 'Iniciante' }, { value: 'intermediate', label: 'Intermediário' }, { value: 'advanced', label: 'Avançado' }]} />
            </Field>
            <Field label="Dias de treino" hint={`${s.trainingDays.length} dias por semana — ciclo A → B → C que se repete. Recomendado: 3 dias com descanso entre eles.`}>
              <div className="flex gap-1.5">
                {WEEK_ORDER.map((d) => {
                  const on = s.trainingDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => upS({ trainingDays: on ? s.trainingDays.filter((x) => x !== d) : [...s.trainingDays, d].sort() })}
                      className={cx('press min-h-11 flex-1 rounded-2xl text-[14px] font-semibold', on ? 'bg-accent text-accent-ink' : 'glass text-ink-2')}
                    >
                      {WEEKDAYS_SHORT[d]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Nível de atividade (contando o treino)">
              <select className={inputCls} value={p.activity} onChange={(e) => up({ activity: e.target.value as Activity })}>
                {Object.entries(ACTIVITY_FACTORS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-[28px] font-bold">Seus horários</h1>
            <p className="text-ink-2">O app calcula o resto do dia a partir da hora em que você sai de casa.</p>
            <Card className="space-y-3">
              <Row label="Saio de casa às"><input type="time" className={cx(inputCls, 'w-32 text-center')} value={s.departure} onChange={(e) => upS({ departure: e.target.value })} /></Row>
              <Row label="Deslocamento"><Stepper label="Deslocamento" value={s.commuteMin} step={5} onChange={(v) => upS({ commuteMin: v })} suffix="min" /></Row>
              <Row label="Preciso sair da academia às"><input type="time" className={cx(inputCls, 'w-32 text-center')} value={s.gymDeadline} onChange={(e) => upS({ gymDeadline: e.target.value })} /></Row>
              <Row label="Horas de sono"><Stepper label="Horas de sono" value={s.sleepHours} step={0.5} onChange={(v) => upS({ sleepHours: v })} suffix="h" /></Row>
            </Card>
            <Card className="grid grid-cols-2 gap-3 text-[15px]">
              <Mini icon="moon" label="Dormir" value={plan.bedtime} />
              <Mini icon="alarm" label="Acordar" value={plan.wake} />
              <Mini icon="diet" label="Pré-treino" value={`${plan.preWorkout.from}–${plan.preWorkout.to}`} />
              <Mini icon="dumbbell" label="Treino" value={`${plan.gymArrival}–${plan.gymDeadline}`} />
            </Card>
            {plan.warnings.map((w) => (
              <p key={w} className="text-[14px] text-warn">{w}</p>
            ))}
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-[28px] font-bold">Tudo pronto{p.name ? `, ${p.name}` : ''}!</h1>
            <Card className="space-y-2">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Suas metas diárias</p>
              <p className="tabular text-[34px] font-bold text-kcal">{t.kcal.toLocaleString('pt-BR')} <span className="text-[17px] text-ink-3">kcal</span></p>
              <div className="tabular grid grid-cols-3 gap-2 text-center">
                <Macro label="Proteína" value={t.protein} color="var(--prot)" />
                <Macro label="Carbo" value={t.carbs} color="var(--carb)" />
                <Macro label="Gordura" value={t.fat} color="var(--fat)" />
              </div>
              <p className="text-[13px] text-ink-3">
                Metabolismo basal {t.bmr} kcal · gasto total {t.tdee} kcal · {p.surplusKcal >= 0 ? '+' : ''}{p.surplusKcal} kcal. Tudo editável na Dieta.
              </p>
            </Card>
            <Card className="text-[15px] text-ink-2">
              Montei um cardápio com 6 refeições e os treinos A, B e C ({s.trainingDays.length}×/semana). Confira os equipamentos da sua academia em <b>Treino → Equipamentos</b>.
            </Card>
            <p className="text-[12px] text-ink-3">Este app é apoio organizacional e não substitui nutricionista, médico ou educador físico.</p>
          </>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && <Button size="lg" onClick={() => setStep(step - 1)}>Voltar</Button>}
        {step < STEPS.length - 1 ? (
          <Button size="lg" variant="primary" className="flex-1" onClick={() => setStep(step + 1)} disabled={step === 2 && s.trainingDays.length === 0}>
            Continuar
          </Button>
        ) : (
          <Button size="lg" variant="primary" className="flex-1" onClick={finish} disabled={busy}>
            Começar
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] font-medium">{label}</span>
      {children}
    </div>
  );
}

function Mini({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-accent"><Icon name={icon} size={20} /></span>
      <div>
        <p className="text-[12px] text-ink-3">{label}</p>
        <p className="tabular font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl p-2" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      <p className="text-[20px] font-bold" style={{ color }}>{value} g</p>
      <p className="text-[12px] text-ink-3">{label}</p>
    </div>
  );
}
