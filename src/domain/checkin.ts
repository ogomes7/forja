import type { BodyMetric, Goal } from '@/db/types';
import { classifyGainPace, weeklySlope } from './nutrition';
import { daysBetween } from './time';

export interface CheckinAnalysis {
  /** kg/semana, pela tendência das últimas semanas. */
  pace: number | null;
  suggestions: string[];
  /** Ajuste de kcal sugerido (0 = manter). */
  kcalDelta: number;
}

/**
 * Analisa as últimas ~3 semanas de pesagens e medidas e sugere ajustes.
 * `metrics` em qualquer ordem; `today` em ISO.
 */
export function analyzeCheckin(metrics: BodyMetric[], today: string, goal: Goal = 'gain'): CheckinAnalysis {
  const recent = metrics.filter((m) => m.weight && daysBetween(m.date, today) <= 21 && daysBetween(m.date, today) >= 0);
  const points = recent.map((m) => ({ day: -daysBetween(m.date, today), weight: m.weight! }));
  const spanDays = points.length ? Math.max(...points.map((p) => -p.day)) - Math.min(...points.map((p) => -p.day)) : 0;
  const pace = spanDays >= 10 ? weeklySlope(points) : null;
  const suggestions: string[] = [];
  let kcalDelta = 0;

  if (pace === null) {
    suggestions.push('Pese-se 3 ou mais vezes por semana (mesmo horário, em jejum) por 2 semanas para o app avaliar a tendência.');
  } else if (goal === 'gain') {
    const c = classifyGainPace(pace);
    if (c === 'perdendo' || c === 'parado') {
      kcalDelta = 200;
      suggestions.push('Peso estável nas últimas semanas → aumente ~150–250 kcal/dia (ex.: +1 vitamina pequena ou +1 colher de pasta de amendoim).');
    } else if (c === 'lento') {
      kcalDelta = 100;
      suggestions.push('Ganho abaixo de 0,25 kg/semana → um pequeno aumento (~100 kcal/dia) ajuda.');
    } else if (c === 'ideal') {
      suggestions.push('Ritmo de ganho na faixa ideal (0,25–0,5 kg/semana). Mantenha o plano.');
    } else if (c === 'rapido') {
      suggestions.push('Ganho um pouco rápido. Se a cintura também subir, reduza ~100 kcal/dia.');
    } else {
      kcalDelta = -150;
      suggestions.push('Ganhando mais de ~0,7 kg/semana → reduza ~150 kcal/dia para limitar o ganho de gordura.');
    }
  } else if (goal === 'cut' && pace > -0.2) {
    kcalDelta = -150;
    suggestions.push('Perda lenta → reduza ~150 kcal/dia ou aumente a atividade.');
  }

  const waist = trend(metrics, 'waist', today);
  const upper = avgDefined([trend(metrics, 'armR', today), trend(metrics, 'armL', today), trend(metrics, 'chest', today)]);
  if (goal === 'gain' && waist !== null && waist > 0.5 && (upper === null || waist > upper * 1.5)) {
    suggestions.push('Cintura subindo mais rápido que braços/peito → revise o superávit (reduza ~100–150 kcal).');
    if (kcalDelta > 0) kcalDelta = 0;
  }
  return { pace, suggestions, kcalDelta };
}

/** Variação (cm) de uma medida entre a mais antiga e a mais nova nas últimas 4 semanas. */
function trend(metrics: BodyMetric[], key: keyof BodyMetric, today: string): number | null {
  const list = metrics
    .filter((m) => typeof m[key] === 'number' && daysBetween(m.date, today) <= 28 && daysBetween(m.date, today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (list.length < 2) return null;
  return (list[list.length - 1][key] as number) - (list[0][key] as number);
}

function avgDefined(v: (number | null)[]): number | null {
  const d = v.filter((x): x is number => x !== null);
  return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
}
