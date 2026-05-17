'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { gsap } from 'gsap';
import { SimulationControls } from './SimulationControls';
import { MeshGradient } from './hero/MeshGradient';
import { TrophySigil } from './hero/TrophySigil';
import type { SimState } from '@/hooks/useSimulation';

interface HeroProps {
  state: SimState;
  onRun: (n: number) => void;
}

export function Hero({ state, onRun }: HeroProps) {
  const t = useTranslations('hero');
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!titleRef.current) return;
    const words = titleRef.current.querySelectorAll('[data-word]');
    gsap.from(words, {
      opacity: 0,
      y: 24,
      filter: 'blur(12px)',
      stagger: 0.06,
      duration: 0.8,
      ease: 'expo.out',
      delay: 0.1,
    });
  }, []);

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      <MeshGradient />

      <div className="relative z-10 mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-gold/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            {t('eyebrow')}
          </div>

          <h1
            ref={titleRef}
            className="mt-5 font-display font-bold leading-[1.02] tracking-[-0.03em] text-fg-0 text-[clamp(2.5rem,6vw,5rem)]"
          >
            <span className="block">
              {t('title_part1').split(' ').map((w, i) => (
                <span key={i} data-word className="inline-block mr-[0.2em]">{w}</span>
              ))}
            </span>
            <span className="block bg-gradient-to-r from-gold via-gold-hi to-gold bg-clip-text text-transparent">
              {t('title_part2').split(' ').map((w, i) => (
                <span key={i} data-word className="inline-block mr-[0.2em]">{w}</span>
              ))}
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-fg-1 sm:text-lg">{t('subtitle')}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-fg-2">
            <span><span data-num className="text-fg-0">104</span> {t('stat_matches')}</span>
            <span className="text-fg-3">·</span>
            <span><span data-num className="text-fg-0">48</span> {t('stat_teams')}</span>
            <span className="text-fg-3">·</span>
            <span><span data-num className="text-fg-0">1.4×10⁴⁸</span> {t('stat_scenarios')}</span>
          </div>

          <div id="simulate" className="mt-8">
            <SimulationControls state={state} onRun={onRun} />
          </div>
        </div>

        <div className="pointer-events-none relative hidden h-[420px] items-center justify-center lg:flex">
          <TrophySigil />
        </div>
      </div>
    </section>
  );
}
