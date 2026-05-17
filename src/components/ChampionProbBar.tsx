'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { gsap } from 'gsap';
import { Flag } from './Flag';
import { cn, formatPct } from '@/lib/utils';
import type { SerializedResult } from '@/lib/sim/worker';

interface Props {
  result: SerializedResult;
}

export function ChampionProbBar({ result }: Props) {
  const t = useTranslations('champion');
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = result.teams
    .map((team, i) => ({
      team,
      idx: i,
      pct: result.stageCounts.champion[i] / result.numSimulations,
      avgGF: result.totalGoalsFor[i] / result.numSimulations,
      avgGA: result.totalGoalsAgainst[i] / result.numSimulations,
    }))
    .filter((r) => r.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 16);

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
  }, [result]);

  return (
    <section id="champion" className="mx-auto max-w-[1280px] px-6 py-20">
      <header className="mb-10">
        <h2 className="font-display text-4xl font-bold tracking-tight text-fg-0 sm:text-5xl">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm text-fg-2">
          {t('subtitle', { n: result.numSimulations.toLocaleString() })}
        </p>
      </header>

      <div ref={containerRef} className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.team.id}
            className={cn(
              'group relative grid grid-cols-[auto_140px_1fr_72px] items-center gap-3 rounded-xl border px-3 py-2 transition-all',
              i === 0
                ? 'border-gold/40 bg-gradient-to-r from-gold/10 to-transparent'
                : 'border-border bg-bg-1/30 hover:bg-bg-1/60 hover:border-border-strong',
            )}
          >
            {i === 0 && (
              <span
                className="pointer-events-none absolute inset-0 -z-10 rounded-xl opacity-60"
                style={{
                  background:
                    'conic-gradient(from var(--angle, 0deg), transparent 0deg, oklch(0.80 0.18 75 / 0.4) 90deg, transparent 180deg, oklch(0.65 0.20 295 / 0.3) 270deg, transparent 360deg)',
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
                      ? 'linear-gradient(90deg, oklch(0.80 0.18 75) 0%, oklch(0.90 0.16 80) 100%)'
                      : 'linear-gradient(90deg, oklch(0.65 0.18 70 / 0.85) 0%, oklch(0.80 0.18 75 / 0.85) 100%)',
                  boxShadow: i === 0 ? '0 0 24px -4px oklch(0.80 0.18 75 / 0.65)' : 'none',
                }}
              />
            </div>
            <div className="text-right font-mono text-sm font-medium tabular text-fg-0">
              {formatPct(r.pct, 2)}
            </div>

            {i === 0 && (
              <span className="absolute -top-2 right-3 rounded-full bg-gold px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-bg-0 shadow-[0_4px_16px_-4px_oklch(0.80_0.18_75/0.8)]">
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
          </div>
        ))}
      </div>
    </section>
  );
}
