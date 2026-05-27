'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { DemoMarket, DemoTicketListing } from '@/lib/demo/types';
import type { useDemoWallet } from '@/hooks/useDemoWallet';

type Wallet = ReturnType<typeof useDemoWallet>;

interface Props {
  markets: DemoMarket[];
  listings: DemoTicketListing[];
  wallet: Wallet;
}

export function PortfolioTab({ markets, listings, wallet }: Props) {
  const t = useTranslations('demo');
  const { posValue, ticketValue, total } = wallet.portfolioValue(markets, listings);
  const settled = wallet.wallet.positions.filter((p) => p.settled);
  const open = wallet.wallet.positions.filter((p) => !p.settled);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={t('cash')} value={`$${wallet.wallet.balance.toFixed(2)}`} />
        <Stat label={t('markets_value')} value={`$${posValue.toFixed(2)}`} accent="gold" />
        <Stat label={t('tickets_value')} value={`$${ticketValue.toFixed(2)}`} accent="emerald" />
        <Stat label={t('total_value')} value={`$${total.toFixed(2)}`} highlight />
      </div>

      {wallet.wallet.settlementLabel && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-sm text-fg-1">
          {t('last_settlement')}: {wallet.wallet.settlementLabel}
        </div>
      )}

      <section>
        <h3 className="text-sm font-medium text-fg-0">{t('market_positions')}</h3>
        {open.length === 0 && settled.length === 0 ? (
          <p className="mt-2 text-sm text-fg-3">{t('no_positions')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {open.map((p) => {
              const m = markets.find((x) => x.id === p.marketId);
              return (
                <li key={p.id} className="rounded-xl border border-border/60 bg-bg-1/30 px-3 py-2 text-sm">
                  <span className="text-fg-1">{m?.title ?? p.marketId}</span>
                  <span className="ml-2 font-mono text-xs text-fg-3">
                    {p.shares.toFixed(1)} YES @ {(p.avgPrice * 100).toFixed(1)}¢
                  </span>
                </li>
              );
            })}
            {settled.map((p) => {
              const m = markets.find((x) => x.id === p.marketId);
              const won = (p.payout ?? 0) > 0;
              return (
                <li
                  key={p.id}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm',
                    won ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5',
                  )}
                >
                  <span className="text-fg-1">{m?.title ?? p.marketId}</span>
                  <span className={cn('ml-2 font-mono text-xs', won ? 'text-emerald-400' : 'text-rose-400')}>
                    {won ? t('won') : t('lost')} · ${(p.payout ?? 0).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-fg-0">{t('ticket_holdings')}</h3>
        {wallet.wallet.tickets.length === 0 ? (
          <p className="mt-2 text-sm text-fg-3">{t('no_tickets')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {wallet.wallet.tickets.map((h) => {
              const l = listings.find((x) => x.id === h.listingId);
              return (
                <li key={h.id} className="rounded-xl border border-border/60 bg-bg-1/30 px-3 py-2 text-sm">
                  <span className="text-fg-1">{l?.matchLabel ?? h.listingId}</span>
                  <span className="ml-2 font-mono text-xs text-fg-3">
                    ×{h.quantity} · paid ${h.avgPrice}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: 'gold' | 'emerald';
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-bg-1/40 p-4',
        highlight && 'border-gold/30 bg-gold/5',
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-fg-3">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-xl font-semibold',
          highlight ? 'text-gold' : accent === 'gold' ? 'text-gold/90' : accent === 'emerald' ? 'text-emerald-400' : 'text-fg-0',
        )}
      >
        {value}
      </p>
    </div>
  );
}
