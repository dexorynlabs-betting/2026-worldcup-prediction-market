'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { gsap } from 'gsap';
import { Flag } from './Flag';
import { cn, formatPct, wilsonCI, formatCIHalf } from '@/lib/utils';
import { useSelection } from '@/hooks/useSelection';
import type { SerializedResult } from '@/lib/sim/worker';

interface Props {
  result: SerializedResult;
  /** Counterfactual run with absences disabled. When present, enables the with/without toggle. */
  resultNoAbsences?: SerializedResult | null;
}

export function ChampionProbBar({ result, resultNoAbsences }: Props) {
  const t = useTranslations('champion');
  const containerRef = useRef<HTMLDivElement>(null);
  const openTeam = useSelection((s) => s.openTeam);
  const [mode, setMode] = useState<'with' | 'without'>('with');

  // Switch the source result when the toggle changes (no-op if the
  // counterfactual run wasn't provided).
  const active = mode === 'without' && resultNoAbsences ? resultNoAbsences : result;

  const rows = useMemo(() => (
    active.teams
      .map((team, i) => {
        const count = active.stageCounts.champion[i];
        const ci = wilsonCI(count, active.numSimulations);
        return {
          team,
          idx: i,
          pct: count / active.numSimulations,
          ci,
          avgGF: active.totalGoalsFor[i] / active.numSimulations,
          avgGA: active.totalGoalsAgainst[i] / active.numSimulations,
        };
      })
      .filter((r) => r.pct > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 16)
  ), [active]);

  const max = rows[0]?.pct ?? 1;

  useEffect(() => {
    if (!containerRef.current) return;
    const bars = containerRef.current.querySelectorAll('[data-bar]');
    gsap.fromTo(
      bars,
      { scaleX: 0, opacity: 0 },
      {
        scaleX: 1,
        opacity: 1,
        stagger: 0.05,
        duration: 0.9,
        ease: 'expo.out',
        transformOrigin: 'left',
      },
    );
  }, [active]);

  return (
    <section id="champion" className="mx-auto max-w-[1280px] px-6 py-20">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-fg-0 sm:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-2 text-sm text-fg-2">
            {t('subtitle', { n: active.numSimulations.toLocaleString() })}
          </p>
        </div>
        {resultNoAbsences && (
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-1/50 p-1 text-xs">
            <button
              onClick={() => setMode('with')}
              className={cn(
                'rounded-full px-3 py-1 font-mono uppercase tracking-[0.14em] text-[10px] transition-colors',
                mode === 'with'
                  ? 'bg-rose/15 text-rose'
                  : 'text-fg-3 hover:text-fg-1',
              )}
            >
              Con lesiones
            </button>
            <button
              onClick={() => setMode('without')}
              className={cn(
                'rounded-full px-3 py-1 font-mono uppercase tracking-[0.14em] text-[10px] transition-colors',
                mode === 'without'
                  ? 'bg-emerald/15 text-emerald'
                  : 'text-fg-3 hover:text-fg-1',
              )}
            >
              Sin lesiones
            </button>
          </div>
        )}
      </header>

      <div ref={containerRef} className="space-y-2">
        {rows.map((r, i) => (
          <button
            key={r.team.id}
            onClick={() => openTeam(r.team.id)}
            className={cn(
              'group relative grid w-full grid-cols-[auto_140px_1fr_72px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all',
              i === 0
                ? 'border-gold/40 bg-gradient-to-r from-gold/10 to-transparent hover:border-gold/60'
                : 'border-border bg-bg-1/30 hover:bg-bg-1/60 hover:border-border-strong',
            )}
          >
            {i === 0 && (
              <span
                className="pointer-events-none absolute inset-0 -z-10 rounded-xl opacity-60"
                style={{
                  background:
                    'conic-gradient(from var(--angle, 0deg), transparent 0deg, oklch(0.66 0.10 180 / 0.45) 90deg, transparent 180deg, oklch(0.52 0.08 180 / 0.3) 270deg, transparent 360deg)',
                  filter: 'blur(20px)',
                  animation: 'spin-slow 10s linear infinite',
                }}
              />
            )}

            <span className="w-6 text-right font-mono text-xs text-fg-3 tabular">{i + 1}</span>
            <div className="flex items-center gap-2 min-w-0">
              <Flag code={r.team.flag} size={26} />
              <span className="truncate font-medium text-fg-0">{r.team.name_es}</span>
            </div>
            <div className="relative h-6 overflow-hidden rounded-full bg-bg-2/60">
              <div
                data-bar
                className="h-full rounded-full"
                style={{
                  width: `${(r.pct / max) * 100}%`,
                  background:
                    i === 0
                      ? 'linear-gradient(90deg, oklch(0.66 0.10 180) 0%, oklch(0.78 0.09 180) 100%)'
                      : 'linear-gradient(90deg, oklch(0.52 0.08 180 / 0.85) 0%, oklch(0.66 0.10 180 / 0.85) 100%)',
                  boxShadow: i === 0 ? '0 0 24px -4px oklch(0.66 0.10 180 / 0.65)' : 'none',
                }}
              />
            </div>
            <div className="text-right font-mono text-sm font-medium tabular text-fg-0">
              <div>{formatPct(r.pct, 2)}</div>
              <div className="text-[9px] font-normal text-fg-3" title={`95% CI: ${formatPct(r.ci.lo, 2)}–${formatPct(r.ci.hi, 2)}`}>
                {formatCIHalf(r.ci.halfWidth)}
              </div>
            </div>

            {i === 0 && (
              <span className="absolute -top-2 right-3 rounded-full bg-gold px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-bg-0 shadow-[0_4px_16px_-4px_oklch(0.66_0.10_180/0.8)]">
                {t('most_likely')}
              </span>
            )}

            {/* hover info */}
            <div className="pointer-events-none absolute left-44 top-full z-20 mt-1 hidden translate-y-1 rounded-lg border border-border bg-bg-2/95 px-3 py-2 text-xs shadow-card backdrop-blur group-hover:block">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 whitespace-nowrap">
                <span className="text-fg-3">{t('stat_elo')}</span>
                <span className="font-mono tabular text-fg-0">{r.team.elo}</span>
                <span className="text-fg-3">GF</span>
                <span className="font-mono tabular text-emerald">{r.avgGF.toFixed(1)}</span>
                <span className="text-fg-3">GA</span>
                <span className="font-mono tabular text-rose">{r.avgGA.toFixed(1)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
