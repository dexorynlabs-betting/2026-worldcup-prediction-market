'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

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
        <Link href="/" className="flex items-center gap-2 group">
          <Trophy className="h-5 w-5 text-gold transition-transform group-hover:rotate-12" strokeWidth={1.5} />
          <span className="text-sm font-medium tracking-wide text-fg-0">{t('brand')}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-fg-2">
          <a href="#simulate" className="hover:text-fg-0 transition-colors">{t('nav_simulate')}</a>
          <a href="#methodology" className="hover:text-fg-0 transition-colors">{t('nav_methodology')}</a>
        </nav>

        <div className="flex items-center gap-1 rounded-full border border-border bg-bg-1/40 p-0.5">
          <button
            onClick={() => switchLocale('es')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              locale === 'es' ? 'bg-gold/90 text-bg-0' : 'text-fg-2 hover:text-fg-0',
            )}
            aria-label="Español"
          >
            {t('lang_es')}
          </button>
          <button
            onClick={() => switchLocale('en')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              locale === 'en' ? 'bg-gold/90 text-bg-0' : 'text-fg-2 hover:text-fg-0',
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
