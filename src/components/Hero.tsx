'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { gsap } from 'gsap';
import { SimulationControls } from './SimulationControls';
import { TrophyCanvas } from './hero/TrophyCanvas';
import { MeshGradient } from './hero/MeshGradient';
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
    const tl = gsap.timeline({ delay: 0.2 });
    const words = titleRef.current.querySelectorAll('[data-word]');
    tl.from(words, {
      opacity: 0,
      y: 40,
      filter: 'blur(20px)',
      stagger: 0.08,
      duration: 0.9,
      ease: 'expo.out',
    });
  }, []);

  return (
    <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
      <MeshGradient />

      <div className="relative z-10 mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-gold/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            {t('eyebrow')}
          </div>

          <h1
            ref={titleRef}
            className="mt-6 font-display text-[clamp(3rem,8vw,7rem)] font-bold leading-[0.95] tracking-[-0.04em] text-fg-0"
          >
            <span className="block">
              {t('title_part1').split(' ').map((w, i) => (
                <span key={i} data-word className="inline-block mr-[0.25em]">{w}</span>
              ))}
            </span>
            <span className="block bg-gradient-to-r from-gold via-gold-hi to-gold bg-clip-text text-transparent">
              {t('title_part2').split(' ').map((w, i) => (
                <span key={i} data-word className="inline-block mr-[0.25em]">{w}</span>
              ))}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-fg-1">{t('subtitle')}</p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-fg-2">
            <span><span data-num className="text-fg-0">104</span> {t('stat_matches')}</span>
            <span className="text-fg-3">·</span>
            <span><span data-num className="text-fg-0">48</span> {t('stat_teams')}</span>
            <span className="text-fg-3">·</span>
            <span><span data-num className="text-fg-0">1.4×10⁴⁸</span> {t('stat_scenarios')}</span>
          </div>

          <div id="simulate" className="mt-10">
            <SimulationControls state={state} onRun={onRun} />
          </div>
        </div>

        <div className="relative h-[360px] sm:h-[420px] lg:h-[520px]">
          <TrophyCanvas />
        </div>
      </div>
    </section>
  );
}
