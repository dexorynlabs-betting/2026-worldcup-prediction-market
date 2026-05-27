'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function Header() {
  const t = useTranslations('header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const switchLocale = (to: 'es' | 'en') => {
    router.replace(pathname, { locale: to });
  };

  const navLink = (href: string, label: string) => {
    const path = href.split('#')[0] || '/';
    const active = path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

    return (
      <Link
        href={href}
        className={cn(
          'font-medium transition-colors',
          active ? 'text-gold' : 'text-fg-0/85 hover:text-gold',
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'py-2' : 'py-4',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-[1440px] items-center justify-between gap-6 rounded-full border px-5 transition-all duration-300',
          scrolled
            ? 'glass mx-4 h-12 border-border'
            : 'mx-6 h-14 border-transparent',
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo-worldcup2026.webp"
            alt="FIFA World Cup 2026"
            width={250}
            height={386}
            priority
            className={cn(
              'w-auto object-contain transition-transform group-hover:scale-105',
              scrolled ? 'h-7' : 'h-9',
            )}
          />
          <span className="text-sm font-medium tracking-wide text-fg-0">{t('brand')}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          {navLink('/#simulate', t('nav_simulate'))}
          {navLink('/backtest', 'Backtest')}
          {navLink('/demo', t('nav_demo'))}
          {navLink('/methodology', t('nav_methodology'))}
        </nav>

        <div className="flex items-center gap-1 rounded-full border border-border bg-bg-1/40 p-0.5">
          <button
            onClick={() => switchLocale('es')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              locale === 'es' ? 'bg-gold text-bg-0' : 'text-fg-0/80 hover:text-fg-0',
            )}
            aria-label="Español"
          >
            {t('lang_es')}
          </button>
          <button
            onClick={() => switchLocale('en')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              locale === 'en' ? 'bg-gold text-bg-0' : 'text-fg-0/80 hover:text-fg-0',
            )}
            aria-label="English"
          >
            {t('lang_en')}
          </button>
        </div>
      </div>
    </header>
  );
}
