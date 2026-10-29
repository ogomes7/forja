import { useEffect, useMemo, useState } from 'react';
import { Button, Field, IconButton, Sheet, inputCls } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { deleteMeal, equivalentQty, saveMeal } from '@/db/repo';
import type { Food, MealItem, MealTemplate } from '@/db/types';
import { itemMacros, mealMacros } from '@/domain/nutrition';
import { GROUP_LABEL, UNIT_LABEL } from '@/seed/foods';

export function MealEditor({ meal, foods, onClose }: { meal: MealTemplate | null; foods: { list: Food[]; map: Map<string, Food> }; onClose: () => void }) {
  const [draft, setDraft] = useState<MealTemplate | null>(meal);
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'swap'; index: number } | null>(null);
  useEffect(() => setDraft(meal), [meal]);
  if (!draft) return null;

  const total = mealMacros(draft.items, foods.map);
  const setItems = (items: MealItem[]) => setDraft({ ...draft, items });

  return (
    <Sheet open={!!meal} onClose={onClose} title="Editar refeição">
      <div className="space-y-3 pb-4">
        <div className="flex gap-2">
          <Field label="Nome">
            <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Horário">
            <input type="time" className={`${inputCls} w-28`} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
          </Field>
        </div>

        <p className="tabular text-[14px] text-ink-2">
          <b className="text-kcal">{Math.round(total.kcal)} kcal</b> · P {Math.round(total.protein)} g · C {Math.round(total.carbs)} g · G {Math.round(total.fat)} g
        </p>

        <ul className="space-y-2">
          {draft.items.map((it, idx) => {
            const f = foods.map.get(it.foodId);
            const m = itemMacros(it, f);
            const step = f?.unit === 'g' || f?.unit === 'ml' ? 10 : 0.5;
            return (
              <li key={idx} className="glass rounded-2xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{f?.name ?? it.foodId}</p>
                    <p className="tabular text-[12px] text-ink-3">{Math.round(m.kcal)} kcal · P {Math.round(m.protein)} g</p>
                  </div>
                  <div className="flex shrink-0">
                    <IconButton icon="swap" label="Trocar por equivalente" onClick={() => setPicker({ mode: 'swap', index: idx })} />
                    <IconButton icon="trash" label="Remover" className="text-danger" onClick={() => setItems(draft.items.filter((_, i) => i !== idx))} />
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <IconButton icon="minus" label="Menos" className="glass" onClick={() => setItems(draft.items.map((x, i) => (i === idx ? { ...x, qty: Math.max(step, +(x.qty - step).toFixed(1)) } : x)))} />
                  <input
                    inputMode="decimal"
                    aria-label={`Quantidade de ${f?.name}`}
                    className="tabular w-16 bg-transparent text-center text-[18px] font-bold outline-none"
                    value={String(it.qty).replace('.', ',')}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value.replace(',', '.'));
                      setItems(draft.items.map((x, i) => (i === idx ? { ...x, qty: Number.isFinite(n) ? n : 0 } : x)));
                    }}
                  />
                  <span className="text-[13px] text-ink-3">{f ? UNIT_LABEL[f.unit] : ''}</span>
                  <IconButton icon="plus" label="Mais" className="glass ml-auto" onClick={() => setItems(draft.items.map((x, i) => (i === idx ? { ...x, qty: +(x.qty + step).toFixed(1) } : x)))} />
                </div>
              </li>
            );
          })}
        </ul>
        <Button className="w-full" onClick={() => setPicker({ mode: 'add' })}>
          <Icon name="plus" size={18} /> Adicionar alimento
        </Button>

        <div className="flex gap-2 pt-2">
          <Button
            variant="danger"
            onClick={async () => {
              if (confirm('Excluir esta refeição deste dia?')) {
                await deleteMeal(draft.id);
                onClose();
              }
            }}
          >
            Excluir
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={async () => {
              await saveMeal({ ...draft, items: draft.items.filter((i) => i.qty > 0) });
              onClose();
            }}
          >
            Salvar
          </Button>
        </div>
      </div>

      {picker && (
        <FoodPicker
          foods={foods.list}
          swapFrom={picker.mode === 'swap' ? { food: foods.map.get(draft.items[picker.index].foodId)!, qty: draft.items[picker.index].qty } : undefined}
          onClose={() => setPicker(null)}
          onPick={(food, qty) => {
            if (picker.mode === 'add') setItems([...draft.items, { foodId: food.id, qty }]);
            else setItems(draft.items.map((x, i) => (i === picker.index ? { foodId: food.id, qty } : x)));
            setPicker(null);
          }}
        />
      )}
    </Sheet>
  );
}

function FoodPicker({ foods, swapFrom, onPick, onClose }: { foods: Food[]; swapFrom?: { food: Food; qty: number }; onPick: (f: Food, qty: number) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    let l = foods.filter((f) => norm(f.name).includes(norm(q)));
    if (swapFrom && !q) l = l.filter((f) => f.group === swapFrom.food.group && f.id !== swapFrom.food.id);
    return l;
  }, [foods, q, swapFrom]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Escolher alimento">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="glass fade-up pb-safe relative max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] px-4 pt-4" style={{ background: 'var(--glass-strong)' }}>
        <div className="mb-3 flex items-center gap-2">
          <input autoFocus placeholder={swapFrom ? `Substituir ${swapFrom.food.name}…` : 'Buscar alimento…'} className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
          <IconButton icon="x" label="Fechar" onClick={onClose} />
        </div>
        {swapFrom && !q && <p className="mb-2 text-[13px] text-ink-3">Equivalentes em {GROUP_LABEL[swapFrom.food.group].toLowerCase()} (mesmas {swapFrom.food.group === 'proteina' || swapFrom.food.group === 'laticinio' ? 'proteínas' : 'calorias'}):</p>}
        <ul className="pb-4">
          {list.map((f) => {
            const qty = swapFrom ? equivalentQty(swapFrom.food, swapFrom.qty, f) : f.unit === 'g' || f.unit === 'ml' ? 100 : 1;
            return (
              <li key={f.id}>
                <button type="button" onClick={() => onPick(f, qty)} className="press flex min-h-12 w-full items-center justify-between gap-2 border-b border-[color:var(--glass-edge)] py-2 text-left">
                  <span>
                    <span className="block font-medium">{f.name}</span>
                    <span className="text-[12px] text-ink-3">{GROUP_LABEL[f.group]} · {f.kcal} kcal / {f.portion} {UNIT_LABEL[f.unit]}</span>
                  </span>
                  <span className="tabular shrink-0 text-[14px] font-semibold text-accent">{String(qty).replace('.', ',')} {UNIT_LABEL[f.unit]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
