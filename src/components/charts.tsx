import { useEffect, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateBR, isoDate } from '@/domain/time';
import { Segmented } from './ui';

/** Lê as cores dos tokens CSS (atributos SVG não resolvem var()). Atualiza com o tema. */
export function useThemeColors() {
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    return { accent: v('--accent'), soft: v('--accent-soft'), ink3: v('--text-3'), ink2: v('--text-2'), edge: v('--glass-edge'), surface: v('--glass-strong'), text: v('--text') };
  };
  const [c, setC] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setC(read());
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      obs.disconnect();
    };
  }, []);
  return c;
}

export type Period = '30' | '90' | '180' | 'all';
export const PERIODS: { value: Period; label: string }[] = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '180', label: '6m' },
  { value: 'all', label: 'Tudo' },
];

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return <Segmented<Period> label="Período" value={value} onChange={onChange} options={PERIODS} />;
}

export interface SeriesPoint {
  t: number; // timestamp (ms)
  date: string;
  value?: number;
  avg?: number | null;
  band?: [number, number];
}

/**
 * Gráfico de linha de série única: pontos brutos discretos, linha principal (média ou valor)
 * e, opcionalmente, faixa-alvo sombreada. Um único eixo Y.
 */
export function TrendChart({ data, unit, showDots = true, height = 220, label }: { data: SeriesPoint[]; unit: string; showDots?: boolean; height?: number; label: string }) {
  const c = useThemeColors();
  if (data.length < 2) return <p className="py-10 text-center text-[14px] text-ink-3">Registre pelo menos 2 valores para ver a curva.</p>;
  const hasAvg = data.some((d) => d.avg != null);
  const vals = data.flatMap((d) => [d.value, d.avg ?? undefined, ...(d.band ?? [])]).filter((v): v is number => typeof v === 'number');
  const pad = Math.max(0.5, (Math.max(...vals) - Math.min(...vals)) * 0.15);
  const domain: [number, number] = [Math.floor((Math.min(...vals) - pad) * 2) / 2, Math.ceil((Math.max(...vals) + pad) * 2) / 2];
  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  return (
    <div role="img" aria-label={`${label}: ${data.length} registros, de ${fmt(data[0].value ?? 0)} a ${fmt(data.at(-1)!.value ?? 0)} ${unit}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={c.edge} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t) => formatDateBR(isoDate(new Date(t)))}
            tick={{ fill: c.ink3, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis domain={domain} tick={{ fill: c.ink3, fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={fmt} />
          <Tooltip
            cursor={{ stroke: c.ink3, strokeDasharray: '3 3' }}
            contentStyle={{ background: c.surface, border: `1px solid ${c.edge}`, borderRadius: 14, color: c.text, fontSize: 13 }}
            labelFormatter={(t) => formatDateBR(isoDate(new Date(Number(t))), { day: '2-digit', month: 'short', year: '2-digit' })}
            formatter={(v, name) => {
              if (Array.isArray(v)) return [`${fmt(v[0] as number)}–${fmt(v[1] as number)} ${unit}`, 'Faixa-alvo'];
              return [`${fmt(Number(v))} ${unit}`, name === 'avg' ? 'Média móvel' : 'Registro'];
            }}
          />
          {data.some((d) => d.band) && <Area dataKey="band" stroke="none" fill={c.accent} fillOpacity={0.12} isAnimationActive={false} name="band" />}
          {hasAvg && showDots && <Scatter dataKey="value" fill={c.ink3} shape={(p: { cx?: number; cy?: number }) => <circle cx={p.cx} cy={p.cy} r={4} fill={c.ink3} fillOpacity={0.6} />} isAnimationActive={false} />}
          <Line
            dataKey={hasAvg ? 'avg' : 'value'}
            stroke={c.accent}
            strokeWidth={2}
            dot={hasAvg ? false : { r: 4, fill: c.accent, stroke: c.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function filterPeriod<T extends { date: string }>(list: T[], p: Period): T[] {
  if (p === 'all') return list;
  const cut = new Date();
  cut.setDate(cut.getDate() - Number(p));
  const iso = isoDate(cut);
  return list.filter((x) => x.date >= iso);
}
