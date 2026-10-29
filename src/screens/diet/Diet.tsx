import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Button, Card, CheckButton, IconButton, PageHeader, SectionTitle, Sheet, cx } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useFoods, useMealLogs, useMealsForWeekday, useProfile, useWater } from '@/db/hooks';
import { addMeal, addWater, copyDay, scaleWeekToTarget, targetsFor, toggleMealLog } from '@/db/repo';
import type { MealTemplate } from '@/db/types';
import { mealMacros, sumMacros } from '@/domain/nutrition';
import { WEEKDAYS, WEEKDAYS_SHORT, WEEK_ORDER, isoDate } from '@/domain/time';
import { UNIT_LABEL } from '@/seed/foods';
import { useUi } from '@/store';
import { MealEditor } from './MealEditor';

export function Diet() {
  const wd = useUi((s) => s.dietWeekday);
  const setWd = useUi((s) => s.setDietWeekday);
  const toast = useUi((s) => s.showToast);
  const todayWd = new Date().getDay();
  const isToday = wd === todayWd;
  const today = isoDate();
  const profile = useProfile();
  const meals = useMealsForWeekday(wd);
  const foods = useFoods();
  const logs = useMealLogs(today);
  const water = useWater(today) ?? 0;
  const [editing, setEditing] = useState<MealTemplate | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  if (!profile || !meals || !foods || !logs) return null;
  const t = targetsFor(profile);
  const planned = sumMacros(meals.map((m) => mealMacros(m.items, foods.map)));
  const done = meals.filter((m) => logs.get(m.id));

  return (
    <>
      <PageHeader title="Dieta" subtitle={`Meta ${t.kcal.toLocaleString('pt-BR')} kcal · ${t.protein} g proteína`} />

      <nav className="-mx-1 mb-3 flex gap-2 no-scrollbar overflow-x-auto px-1 pb-1" aria-label="Atalhos da dieta">
        <Chip to="/dieta/metas" icon="target" label="Metas" />
        <Chip to="/dieta/vitaminas" icon="shake" label="Vitaminas e dicas" />
        <Chip to="/dieta/compras" icon="cart" label="Lista de compras" />
      </nav>

      <div role="tablist" aria-label="Dia da semana" className="glass flex gap-1 rounded-full p-1">
        {WEEK_ORDER.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={wd === d}
            onClick={() => setWd(d)}
            className={cx('press relative min-h-10 flex-1 rounded-full text-[13px] font-semibold', wd === d ? 'bg-accent text-accent-ink' : 'text-ink-2')}
          >
            {WEEKDAYS_SHORT[d]}
            {d === todayWd && <span className={cx('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', wd === d ? 'bg-accent-ink' : 'bg-accent')} />}
          </button>
        ))}
      </div>

      <Card className="mt-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">{isToday ? 'Hoje' : WEEKDAYS[wd]} · planejado</p>
          {isToday && <p className="tabular text-[14px] text-ink-3">{done.length}/{meals.length} refeições</p>}
        </div>
        <MacroBar label="Calorias" value={planned.kcal} target={t.kcal} unit="kcal" color="var(--kcal)" />
        <MacroBar label="Proteína" value={planned.protein} target={t.protein} unit="g" color="var(--prot)" />
        <MacroBar label="Carboidratos" value={planned.carbs} target={t.carbs} unit="g" color="var(--carb)" />
        <MacroBar label="Gorduras" value={planned.fat} target={t.fat} unit="g" color="var(--fat)" />
        {(Math.abs(planned.kcal - t.kcal) > 150 || Math.abs(planned.protein - t.protein) > 25 || planned.fat - t.fat > 20) && (
          <Button
            size="sm"
            className="mt-1"
            onClick={async () => {
              await scaleWeekToTarget(t);
              toast('Porções ajustadas à meta em todos os dias', 'check');
            }}
          >
            <Icon name="sparkle" size={16} /> Ajustar porções à meta
          </Button>
        )}
      </Card>

      {isToday && (
        <Card className="mt-3 flex items-center gap-3">
          <span className="text-water"><Icon name="drop" size={26} /></span>
          <div className="flex-1">
            <p className="tabular font-semibold">
              {(water / 1000).toFixed(2).replace('.', ',')} L <span className="font-normal text-ink-3">de {(profile.waterMl / 1000).toFixed(1).replace('.', ',')} L</span>
            </p>
            <Bar value={water / profile.waterMl} color="var(--water)" className="mt-1" />
          </div>
          <IconButton icon="minus" label="Remover 250 ml" className="glass" onClick={() => addWater(today, -250)} />
          <Button size="md" variant="primary" onClick={() => addWater(today, 250)} aria-label="Adicionar 250 ml">+250</Button>
        </Card>
      )}

      <SectionTitle right={<Button size="sm" variant="ghost" onClick={() => setCopyOpen(true)}><Icon name="copy" size={16} /> Copiar dia</Button>}>Refeições</SectionTitle>
      <ul className="space-y-3">
        {meals.map((m) => {
          const mm = mealMacros(m.items, foods.map);
          const checked = isToday && !!logs.get(m.id);
          return (
            <li key={m.id} className={cx('glass rounded-[22px] transition-opacity', checked && 'opacity-70')}>
              <div className="flex items-center gap-3 p-4 pb-2">
                <span className="tabular w-12 text-[15px] font-semibold">{m.time}</span>
                <div className="min-w-0 flex-1">
                  <p className={cx('font-semibold', checked && 'line-through')}>{m.name}</p>
                  <p className="tabular text-[13px] text-ink-3">
                    <span className="text-kcal">{Math.round(mm.kcal)} kcal</span> · P {Math.round(mm.protein)} · C {Math.round(mm.carbs)} · G {Math.round(mm.fat)}
                  </p>
                </div>
                {isToday && <CheckButton checked={checked} onToggle={() => toggleMealLog(today, m.id)} label={`Marcar ${m.name} como feita`} />}
              </div>
              <button type="button" onClick={() => setEditing(m)} className="press block w-full px-4 pb-3 text-left" aria-label={`Editar ${m.name}`}>
                <ul className="space-y-0.5 text-[14px] text-ink-2">
                  {m.items.map((i, k) => {
                    const f = foods.map.get(i.foodId);
                    return (
                      <li key={k} className="flex justify-between gap-2">
                        <span className="truncate">{f?.name ?? i.foodId}</span>
                        <span className="tabular shrink-0 text-ink-3">{String(i.qty).replace('.', ',')} {f ? UNIT_LABEL[f.unit] : ''}</span>
                      </li>
                    );
                  })}
                  {!m.items.length && <li className="text-ink-3">Toque para adicionar alimentos</li>}
                </ul>
                <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-accent"><Icon name="edit" size={14} /> Editar</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button
        className="mt-3 w-full"
        onClick={async () => {
          const m = await addMeal(wd, 'Nova refeição', '10:00');
          setEditing(m);
        }}
      >
        <Icon name="plus" size={18} /> Adicionar refeição
      </Button>

      <p className="mt-6 px-1 text-[12px] text-ink-3">Valores estimados. O app é apoio organizacional e não substitui nutricionista ou médico.</p>

      <MealEditor meal={editing} foods={foods} onClose={() => setEditing(null)} />
      <CopySheet open={copyOpen} from={wd} onClose={() => setCopyOpen(false)} onDone={(n) => toast(`${WEEKDAYS[wd]} copiada para ${n} dia(s)`, 'copy')} />
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

function MacroBar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  return (
    <div>
      <div className="tabular flex justify-between text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span>
          <b>{Math.round(value).toLocaleString('pt-BR')}</b> <span className="text-ink-3">/ {target.toLocaleString('pt-BR')} {unit}</span>
        </span>
      </div>
      <Bar value={value / target} color={color} className="mt-1" />
    </div>
  );
}

function CopySheet({ open, from, onClose, onDone }: { open: boolean; from: number; onClose: () => void; onDone: (n: number) => void }) {
  const [sel, setSel] = useState<number[]>([]);
  return (
    <Sheet open={open} onClose={onClose} title={`Copiar ${WEEKDAYS[from]} para…`}>
      <div className="grid grid-cols-4 gap-2">
        {WEEK_ORDER.filter((d) => d !== from).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={sel.includes(d)}
            onClick={() => setSel(sel.includes(d) ? sel.filter((x) => x !== d) : [...sel, d])}
            className={cx('press min-h-11 rounded-2xl font-semibold', sel.includes(d) ? 'bg-accent text-accent-ink' : 'glass')}
          >
            {WEEKDAYS_SHORT[d]}
          </button>
        ))}
      </div>
      <p className="my-3 text-[13px] text-ink-3">As refeições dos dias escolhidos serão substituídas.</p>
      <Button
        variant="primary"
        size="lg"
        className="mb-4 w-full"
        disabled={!sel.length}
        onClick={async () => {
          await copyDay(from, sel);
          onDone(sel.length);
          setSel([]);
          onClose();
        }}
      >
        Copiar
      </Button>
    </Sheet>
  );
}
