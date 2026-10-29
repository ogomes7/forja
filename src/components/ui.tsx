import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './Icon';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ children, className = '', as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'li' | 'article' } & Record<string, unknown>) {
  return (
    <As className={cx('glass rounded-[22px] p-4', className)} {...rest}>
      {children}
    </As>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'glass' | 'danger'; size?: 'md' | 'lg' | 'sm' };
export function Button({ variant = 'glass', size = 'md', className = '', children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={cx(
        'press inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none disabled:opacity-40',
        size === 'lg' && 'min-h-14 px-6 text-[17px]',
        size === 'md' && 'min-h-11 px-4 text-[15px]',
        size === 'sm' && 'min-h-9 px-3 text-[13px]',
        variant === 'primary' && 'bg-accent text-accent-ink shadow-[0_6px_18px_var(--accent-soft)]',
        variant === 'glass' && 'glass text-ink',
        variant === 'ghost' && 'text-accent',
        variant === 'danger' && 'text-danger',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('press inline-flex h-11 w-11 items-center justify-center rounded-full', className)} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="pt-safe flex items-end justify-between gap-3 px-1 pb-3">
      <div className="min-w-0">
        {subtitle && <p className="text-[13px] font-medium uppercase tracking-wide text-ink-3">{subtitle}</p>}
        <h1 className="truncate text-[30px] font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function BackHeader({ title, back, right }: { title: string; back: string; right?: ReactNode }) {
  return (
    <header className="pt-safe flex items-center gap-1 pb-3">
      <a href={`#${back}`} aria-label="Voltar" className="press -ml-2 flex h-11 w-11 items-center justify-center rounded-full text-accent">
        <Icon name="left" size={26} />
      </a>
      <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold">{title}</h1>
      {right}
    </header>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-5 mb-2 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{children}</h2>
      {right}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="glass flex gap-1 rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'press min-h-9 flex-1 rounded-full px-2 text-[14px] font-semibold',
            value === o.value ? 'bg-accent text-accent-ink' : 'text-ink-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Anel de progresso no estilo Apple Fitness. */
export function Ring({ value, color, size = 64, stroke = 8, children, label }: { value: number; color: string; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(value * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 250ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = 'var(--accent)', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cx('h-2 overflow-hidden rounded-full', className)} style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color, transition: 'width 250ms ease' }} />
    </div>
  );
}

/** Botão de check redondo com animação curta. */
export function CheckButton({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="press -m-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
    >
      <span
        className={cx(
          'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-200',
          checked ? 'border-accent bg-accent text-accent-ink' : 'border-[color:var(--text-3)]/50',
        )}
      >
        {checked && <Icon name="check" size={18} strokeWidth={2.5} className="pop" />}
      </span>
    </button>
  );
}

/** Folha inferior modal (bottom sheet). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="glass fade-up pb-safe relative max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] px-4 pt-3" style={{ background: 'var(--glass-strong)' }}>
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[color:var(--text-3)]/40" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[19px] font-bold">{title}</h2>
          <IconButton icon="x" label="Fechar" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'glass min-h-11 w-full rounded-2xl px-3 text-[16px] outline-none focus:ring-2 focus:ring-[color:var(--accent)]';

export function Stepper({ value, onChange, step = 1, min = 0, label, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; label: string; suffix?: string }) {
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <IconButton icon="minus" label={`Diminuir ${label}`} className="glass" onClick={() => onChange(Math.max(min, round(value - step)))} />
      <input
        inputMode="decimal"
        aria-label={label}
        className="tabular w-20 bg-transparent text-center text-[24px] font-bold outline-none"
        value={Number.isFinite(value) ? String(value).replace('.', ',') : ''}
        onChange={(e) => {
          const n = parseFloat(e.target.value.replace(',', '.'));
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
      {suffix && <span className="-ml-2 text-[13px] text-ink-3">{suffix}</span>}
      <IconButton icon="plus" label={`Aumentar ${label}`} className="glass" onClick={() => onChange(round(value + step))} />
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="text-ink-3">
        <Icon name={icon} size={34} />
      </span>
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-xs text-[14px] text-ink-3">{text}</p>}
      {action}
    </div>
  );
}
