'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatNum } from '@/lib/utils';
import type { SimState } from '@/hooks/useSimulation';

const OPTIONS = [1_000, 10_000, 50_000, 100_000] as const;

interface Props {
  state: SimState;
  onRun: (n: number) => void;
}

export function SimulationControls({ state, onRun }: Props) {
  const t = useTranslations('hero');
  const tc = useTranslations('controls');
  const [selected, setSelected] = useState<number>(10_000);
  const startRef = useRef<number | null>(null);
  const isRunning = state.status === 'running';
  const isDone = state.status === 'done';
  const pct = state.total > 0 ? (state.completed / state.total) * 100 : 0;

  useEffect(() => {
    if (isRunning && startRef.current === null) startRef.current = performance.now();
    if (!isRunning) startRef.current = null;
  }, [isRunning]);

  const remaining =
    isRunning && state.completed > 0 && startRef.current !== null
      ? Math.max(0, Math.round(((performance.now() - startRef.current) / state.completed) * (state.total - state.completed) / 1000))
      : null;

  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-[0.18em] text-fg-2 font-mono">{tc('label')}</div>

      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((n) => {
          const active = selected === n;
          return (
            <button
              key={n}
              disabled={isRunning}
              onClick={() => setSelected(n)}
              className={cn(
                'rounded-full border px-4 py-1.5 font-mono text-xs tracking-wider transition-all',
                active
                  ? 'border-gold/60 bg-gold/15 text-gold shadow-[0_0_24px_-8px_oklch(0.80_0.18_75/0.6)]'
                  : 'border-border bg-bg-1/40 text-fg-2 hover:border-border-strong hover:text-fg-1',
                isRunning && 'cursor-not-allowed opacity-50',
              )}
            >
              {n >= 1000 ? `${n / 1000}K` : n}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onRun(selected)}
        disabled={isRunning}
        className={cn(
          'group relative h-16 w-full max-w-md overflow-hidden rounded-2xl text-base font-medium tracking-wide transition-all',
          'border border-gold/40',
          'bg-gradient-to-b from-gold to-gold-lo text-bg-0',
          'shadow-[0_20px_60px_-12px_oklch(0.80_0.18_75/0.55),inset_0_1px_0_oklch(1_0_0/0.4)]',
          'motion-safe:animate-[glow-pulse_3.5s_ease-in-out_infinite]',
          'hover:scale-[1.02] active:scale-[0.99]',
          isRunning && 'cursor-default hover:scale-100',
        )}
      >
        {/* Progress fill */}
        {isRunning && (
          <span
            className="absolute inset-0 origin-left bg-gradient-to-r from-emerald/40 via-emerald/30 to-gold/30"
            style={{ transform: `scaleX(${pct / 100})`, transition: 'transform 200ms linear' }}
          />
        )}

        {/* Shimmer when running */}
        {isRunning && (
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(110deg, transparent 25%, oklch(1 0 0 / 0.18) 50%, transparent 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s linear infinite',
            }}
          />
        )}

        {/* Animated beam border */}
        <span className="pointer-events-none absolute -inset-px rounded-2xl">
          <span
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0%, oklch(1 0 0 / 0.5) 8%, transparent 18%)',
              filter: 'blur(2px)',
              maskImage:
                'linear-gradient(black, black) content-box, linear-gradient(black, black)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: 1,
              animation: 'spin-slow 4s linear infinite',
            }}
          />
        </span>

        <span className="relative z-10 flex items-center justify-center gap-3">
          {isRunning ? (
            <>
              <span className="font-mono tabular-nums">
                {formatNum(state.completed)} / {formatNum(state.total)}
              </span>
              {remaining !== null && (
                <span className="font-mono text-xs opacity-70">· {remaining}s</span>
              )}
            </>
          ) : isDone ? (
            <span>{t('cta_finished')}</span>
          ) : (
            <span className="font-display text-xl uppercase tracking-[0.04em]">{t('cta_simulate')}</span>
          )}
        </span>
      </button>
    </div>
  );
}
