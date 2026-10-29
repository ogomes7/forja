import { useEffect, useMemo, useState } from 'react';
import { BackHeader, Button, Card, Field, Segmented, SectionTitle, Sheet, Stepper, cx, inputCls } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useAllMeals, useFoods, useProfile } from '@/db/hooks';
import { addMeal, saveProfile, scaleWeekToTarget, targetsFor } from '@/db/repo';
import type { Activity, Goal, MacroTargets, MealItem } from '@/db/types';
import { ACTIVITY_FACTORS, GOAL_DEFAULTS, mealMacros } from '@/domain/nutrition';
import { WEEKDAYS_SHORT, WEEK_ORDER } from '@/domain/time';
import { EAT_MORE_TIPS, SHAKES } from '@/seed/menu';
import { GROUP_LABEL, UNIT_LABEL } from '@/seed/foods';
import { useUi } from '@/store';

// ——————————————————— Metas (calculadora) ———————————————————
export function DietGoals() {
  const profile = useProfile();
  const toast = useUi((s) => s.showToast);
  const [manual, setManual] = useState<MacroTargets | null>(null);
  useEffect(() => {
    if (profile) setManual(profile.manualTargets ?? null);
  }, [profile]);
  if (!profile) return null;
  const t = targetsFor(profile);
  const up = (patch: Parameters<typeof saveProfile>[0]) => saveProfile(patch);

  return (
    <>
      <BackHeader title="Metas da dieta" back="/dieta" />
      <Card className="space-y-1">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Meta diária</p>
        <p className="tabular text-[34px] font-bold text-kcal">{t.kcal.toLocaleString('pt-BR')} <span className="text-[17px] text-ink-3">kcal</span></p>
        <p className="tabular text-[15px]">
          <span className="text-prot">P {t.protein} g</span> · <span className="text-carb">C {t.carbs} g</span> · <span className="text-fat">G {t.fat} g</span>
        </p>
        <p className="text-[13px] text-ink-3">
          Metabolismo basal (Mifflin-St Jeor): {t.auto.bmr} kcal · Gasto total: {t.auto.tdee} kcal{profile.manualTargets ? ' · usando metas manuais' : ''}
        </p>
      </Card>

      <SectionTitle>Objetivo</SectionTitle>
      <Segmented<Goal>
        label="Objetivo"
        value={profile.goal}
        onChange={(g) => up({ goal: g, ...GOAL_DEFAULTS[g] })}
        options={[{ value: 'gain', label: 'Ganhar massa' }, { value: 'maintain', label: 'Manter' }, { value: 'cut', label: 'Perder gordura' }]}
      />

      <SectionTitle>Cálculo automático</SectionTitle>
      <Card className="space-y-3">
        <Field label="Nível de atividade">
          <select className={inputCls} value={profile.activity} onChange={(e) => up({ activity: e.target.value as Activity })}>
            {Object.entries(ACTIVITY_FACTORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Row label="Peso atual" hint="Atualizado pelo registro em Evolução"><Stepper label="Peso" value={profile.weightKg} step={0.5} onChange={(v) => up({ weightKg: v })} suffix="kg" /></Row>
        <Row label={profile.surplusKcal >= 0 ? 'Superávit' : 'Déficit'} hint="Ganho de massa: +300 a +500"><Stepper label="Superávit" value={profile.surplusKcal} step={50} min={-1000} onChange={(v) => up({ surplusKcal: v })} suffix="kcal" /></Row>
        <Row label="Proteína" hint="1,6–2,2 g por kg"><Stepper label="Proteína por kg" value={profile.proteinPerKg} step={0.1} onChange={(v) => up({ proteinPerKg: v })} suffix="g/kg" /></Row>
        <Row label="Gordura" hint="0,8–1 g por kg"><Stepper label="Gordura por kg" value={profile.fatPerKg} step={0.1} onChange={(v) => up({ fatPerKg: v })} suffix="g/kg" /></Row>
        <p className="text-[13px] text-ink-3">Carboidratos completam as calorias restantes.</p>
      </Card>

      <SectionTitle>Metas manuais</SectionTitle>
      <Card className="space-y-3">
        <label className="flex min-h-11 items-center justify-between">
          <span className="font-medium">Definir manualmente</span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-[color:var(--accent)]"
            checked={!!manual}
            onChange={(e) => {
              const next = e.target.checked ? { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat } : null;
              setManual(next);
              up({ manualTargets: next ?? undefined });
            }}
          />
        </label>
        {manual && (
          <div className="grid grid-cols-2 gap-2">
            {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
              <Field key={k} label={{ kcal: 'Calorias', protein: 'Proteína (g)', carbs: 'Carboidratos (g)', fat: 'Gorduras (g)' }[k]}>
                <input
                  inputMode="numeric"
                  className={inputCls}
                  value={manual[k]}
                  onChange={(e) => setManual({ ...manual, [k]: Number(e.target.value.replace(/\D/g, '')) })}
                  onBlur={() => up({ manualTargets: manual })}
                />
              </Field>
            ))}
          </div>
        )}
      </Card>

      <SectionTitle>Água</SectionTitle>
      <Card>
        <Row label="Meta diária"><Stepper label="Meta de água" value={profile.waterMl} step={250} onChange={(v) => up({ waterMl: v })} suffix="ml" /></Row>
        <p className="mt-2 text-[13px] text-ink-3">Referência: ~35–40 ml por kg ({Math.round(profile.weightKg * 37.5 / 100) * 100} ml para você).</p>
      </Card>

      <Button
        variant="primary"
        size="lg"
        className="mt-5 w-full"
        onClick={async () => {
          await scaleWeekToTarget(t);
          toast('Cardápio ajustado à nova meta', 'check');
        }}
      >
        Ajustar cardápio à meta
      </Button>
      <p className="mt-4 text-[12px] text-ink-3">Ritmo de referência para ganho de massa: 0,25–0,5 kg por semana. O check-in semanal em Evolução sugere ajustes. Não substitui nutricionista.</p>
    </>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="font-medium">{label}</p>
        {hint && <p className="text-[12px] text-ink-3">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// ——————————————————— Vitaminas e dicas ———————————————————
export function Shakes() {
  const foods = useFoods();
  const toast = useUi((s) => s.showToast);
  const [adding, setAdding] = useState<{ name: string; items: MealItem[] } | null>(null);
  if (!foods) return null;
  return (
    <>
      <BackHeader title="Vitaminas e dicas" back="/dieta" />
      <p className="mb-3 px-1 text-[15px] text-ink-2">Para dias de pouco apetite: calorias líquidas descem mais fácil.</p>
      <ul className="space-y-3">
        {SHAKES.map((s) => {
          const m = mealMacros(s.items, foods.map);
          return (
            <Card key={s.name} as="li">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="tabular text-[13px] text-ink-3"><span className="text-kcal">{Math.round(m.kcal)} kcal</span> · P {Math.round(m.protein)} g · C {Math.round(m.carbs)} g</p>
                </div>
                <Button size="sm" onClick={() => setAdding(s)}><Icon name="plus" size={16} /> Adicionar</Button>
              </div>
              <p className="mt-2 text-[14px] text-ink-2">{s.items.map((i) => `${String(i.qty).replace('.', ',')} ${UNIT_LABEL[foods.map.get(i.foodId)?.unit ?? 'g']} ${foods.map.get(i.foodId)?.name.toLowerCase()}`).join(' · ')}</p>
            </Card>
          );
        })}
      </ul>
      <SectionTitle>Dificuldade para comer mais?</SectionTitle>
      <Card as="div">
        <ul className="space-y-2 text-[15px]">
          {EAT_MORE_TIPS.map((t) => (
            <li key={t} className="flex gap-2"><span className="text-accent"><Icon name="check" size={18} /></span>{t}</li>
          ))}
        </ul>
      </Card>
      <AddShakeSheet shake={adding} onClose={() => setAdding(null)} onDone={(n) => toast(`Vitamina adicionada em ${n} dia(s)`, 'check')} />
    </>
  );
}

function AddShakeSheet({ shake, onClose, onDone }: { shake: { name: string; items: MealItem[] } | null; onClose: () => void; onDone: (n: number) => void }) {
  const [days, setDays] = useState<number[]>([new Date().getDay()]);
  const [time, setTime] = useState('10:00');
  return (
    <Sheet open={!!shake} onClose={onClose} title={`Adicionar ${shake?.name ?? ''}`}>
      <Field label="Horário">
        <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <p className="mt-3 mb-1 text-[13px] font-medium text-ink-2">Dias</p>
      <div className="grid grid-cols-7 gap-1">
        {WEEK_ORDER.map((d) => (
          <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])} className={cx('press min-h-11 rounded-2xl text-[13px] font-semibold', days.includes(d) ? 'bg-accent text-accent-ink' : 'glass')}>
            {WEEKDAYS_SHORT[d]}
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        className="my-4 w-full"
        disabled={!days.length}
        onClick={async () => {
          for (const d of days) await addMeal(d, shake!.name, time, shake!.items.map((i) => ({ ...i })));
          onDone(days.length);
          onClose();
        }}
      >
        Adicionar
      </Button>
    </Sheet>
  );
}

// ——————————————————— Lista de compras ———————————————————
const CHECK_KEY = 'forja.compras';

export function Shopping() {
  const meals = useAllMeals();
  const foods = useFoods();
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHECK_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(CHECK_KEY, JSON.stringify(checked));
    } catch {
      /* armazenamento indisponível: lista funciona sem lembrar */
    }
  }, [checked]);

  const groups = useMemo(() => {
    if (!meals || !foods) return [];
    const totals = new Map<string, number>();
    meals.forEach((m) => m.items.forEach((i) => totals.set(i.foodId, (totals.get(i.foodId) ?? 0) + i.qty)));
    const byGroup = new Map<string, { id: string; name: string; qty: string }[]>();
    for (const [id, qty] of totals) {
      const f = foods.map.get(id);
      if (!f) continue;
      const label = (f.unit === 'g' || f.unit === 'ml') && qty >= 1000 ? `${(qty / 1000).toFixed(1).replace('.', ',')} ${f.unit === 'g' ? 'kg' : 'L'}` : `${String(Math.ceil(qty * 2) / 2).replace('.', ',')} ${UNIT_LABEL[f.unit]}`;
      byGroup.set(f.group, [...(byGroup.get(f.group) ?? []), { id, name: f.name, qty: label }]);
    }
    return [...byGroup.entries()].map(([g, list]) => ({ group: g, list: list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }));
  }, [meals, foods]);

  return (
    <>
      <BackHeader title="Lista de compras" back="/dieta" right={checked.length ? <Button size="sm" variant="ghost" onClick={() => setChecked([])}>Limpar</Button> : undefined} />
      <p className="mb-2 px-1 text-[14px] text-ink-3">Quantidades para 1 semana, somadas do seu cardápio (alimentos prontos/cozidos).</p>
      {groups.map(({ group, list }) => (
        <div key={group}>
          <SectionTitle>{GROUP_LABEL[group]}</SectionTitle>
          <Card className="p-0" as="div">
            <ul>
              {list.map((it, i) => {
                const on = checked.includes(it.id);
                return (
                  <li key={it.id} className={cx(i > 0 && 'border-t border-[color:var(--glass-edge)]')}>
                    <label className="flex min-h-12 items-center gap-3 px-4">
                      <input type="checkbox" className="h-5 w-5 accent-[color:var(--accent)]" checked={on} onChange={() => setChecked(on ? checked.filter((x) => x !== it.id) : [...checked, it.id])} />
                      <span className={cx('flex-1', on && 'text-ink-3 line-through')}>{it.name}</span>
                      <span className="tabular text-[14px] text-ink-3">{it.qty}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ))}
    </>
  );
}
