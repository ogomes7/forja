import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { cx } from './ui';

const tabs = [
  { to: '/', label: 'Hoje', icon: 'today', end: true },
  { to: '/treino', label: 'Treino', icon: 'dumbbell' },
  { to: '/dieta', label: 'Dieta', icon: 'diet' },
  { to: '/evolucao', label: 'Evolução', icon: 'chart' },
];

export function TabBar() {
  return (
    <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 flex justify-center px-4">
      <div className="glass mb-1 flex w-full max-w-md justify-between rounded-[28px] px-2 py-1.5">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cx(
                'press flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11px] font-semibold',
                isActive ? 'bg-accent-soft text-accent' : 'text-ink-3',
              )
            }
          >
            <Icon name={t.icon} size={23} />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
