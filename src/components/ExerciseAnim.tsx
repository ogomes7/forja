import { useState } from 'react';
import type { Exercise } from '@/db/types';
import { cx } from './ui';

/** Demonstração: alterna os 2 quadros do free-exercise-db em loop (CSS). Sem imagem → ilustração SVG simples. */
export function ExerciseAnim({ ex, className = '', still = false }: { ex: Exercise; className?: string; still?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [a, b] = ex.images;
  return (
    <div className={cx('relative overflow-hidden rounded-2xl bg-white', className)} role="img" aria-label={`Demonstração: ${ex.name}`}>
      {!a || failed ? (
        <Fallback />
      ) : (
        <>
          {b && <img src={b} alt="" className="absolute inset-0 h-full w-full object-contain" loading="lazy" onError={() => setFailed(true)} />}
          <img src={a} alt="" className={cx('absolute inset-0 h-full w-full object-contain', !still && b && 'frame-a')} loading="lazy" onError={() => setFailed(true)} />
        </>
      )}
    </div>
  );
}

function Fallback() {
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full text-[#0d9488]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <circle cx="60" cy="20" r="8" />
      <path d="M60 28v28M60 36l-18 10M60 36l18 10M60 56l-12 22M60 56l12 22" />
      <path d="M32 46h-8M96 46h-8M24 40v12M96 40v12" />
    </svg>
  );
}
