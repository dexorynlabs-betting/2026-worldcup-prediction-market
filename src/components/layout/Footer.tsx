import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="relative z-10 mt-32 border-t border-border py-12">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-2">{t('credits')}</p>
        <a
          href="#methodology"
          className="text-xs text-fg-1 underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
        >
          {t('methodology_link')}
        </a>
      </div>
    </footer>
  );
}
