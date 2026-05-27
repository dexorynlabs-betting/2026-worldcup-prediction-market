'use client';

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { gsap } from 'gsap';
import { SimulationControls } from './SimulationControls';
import { MeshGradient } from './hero/MeshGradient';
import { HeroGallery } from './hero/HeroGallery';
import type { SimState } from '@/hooks/useSimulation';

interface HeroProps {
  state: SimState;
  onRun: (n: number) => void;
}

export function Hero({ state, onRun }: HeroProps) {
  const t = useTranslations('hero');
  const locale = useLocale();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!titleRef.current) return;
    const words = titleRef.current.querySelectorAll('[data-word]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { opacity: 0, y: 24, filter: 'blur(12px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          stagger: 0.06,
          duration: 0.8,
          ease: 'expo.out',
          delay: 0.1,
        },
      );
    }, titleRef);
    return () => ctx.revert();
  }, [locale]);

  return (
    <section className="relative overflow-hidden pt-28 pb-4 sm:pt-32 sm:pb-6">
      <MeshGradient />

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 items-start gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10 xl:max-w-[1440px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.28fr)] xl:gap-12">
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
            <span className="block">
              {t('title_part2').split(' ').map((w, i) => (
                <span
                  key={i}
                  data-word
                  className="inline-block mr-[0.2em] bg-gradient-to-r from-gold via-gold-hi to-gold bg-clip-text text-transparent"
                >
                  {w}
                </span>
              ))}
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-1 sm:text-lg">{t('subtitle')}</p>

          <Link
            href="/demo"
            className="mt-4 inline-flex items-center text-sm font-medium text-gold transition-colors hover:text-gold-hi"
          >
            {t('demo_link')}
          </Link>

          <p className="mt-3 max-w-xl text-sm text-fg-2">
            {t('contact_hint')}{' '}
            <span className="font-medium text-gold">{t('contact_brand')}</span>
          </p>

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

        <div className="relative w-full min-w-0">
          <HeroGallery />
        </div>
      </div>
    </section>
  );
}
