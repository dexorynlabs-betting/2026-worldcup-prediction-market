'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatPct } from '@/lib/utils';
import type { DemoMarket } from '@/lib/demo/types';
import type { useDemoWallet } from '@/hooks/useDemoWallet';

type Wallet = ReturnType<typeof useDemoWallet>;

interface Props {
  markets: DemoMarket[];
  wallet: Wallet;
}

export function MarketsTab({ markets, wallet }: Props) {
  const t = useTranslations('demo');
  const [filter, setFilter] = useState<'all' | DemoMarket['type']>('all');
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () => (filter === 'all' ? markets : markets.filter((m) => m.type === filter)),
    [markets, filter],
  );

  const openPositions = wallet.wallet.positions.filter((p) => !p.settled);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(['all', 'winner', 'group_winner', 'h2h'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === f
                ? 'border-gold/50 bg-gold/10 text-gold'
                : 'border-border text-fg-2 hover:text-fg-0',
            )}
          >
            {t(`filter_${f}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((market) => {
          const amt = amounts[market.id] ?? '25';

          return (
            <article
              key={market.id}
              className="rounded-2xl border border-border bg-bg-1/40 p-4 transition-colors hover:border-gold/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-3">
                    {market.subtitle}
                  </p>
                  <h3 className="mt-1 text-sm font-medium text-fg-0">{market.title}</h3>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold text-gold">
                    {(market.yesPrice * 100).toFixed(1)}¢
                  </p>
                  <p className="text-[10px] text-fg-3">{formatPct(market.yesPrice)} model</p>
                </div>
              </div>

              <div className="mt-4 flex items-end gap-2">
                <label className="flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-fg-3">{t('stake')}</span>
                  <div className="mt-1 flex items-center rounded-lg border border-border bg-bg-0/60">
                    <span className="pl-3 text-sm text-fg-3">$</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={amt}
                      onChange={(e) => setAmounts((a) => ({ ...a, [market.id]: e.target.value }))}
                      className="w-full bg-transparent px-2 py-2 text-sm text-fg-0 outline-none"
                    />
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const n = parseFloat(amt);
                    if (!Number.isFinite(n) || n <= 0) return;
                    wallet.buyYes(market, n);
                  }}
                  disabled={wallet.wallet.balance < parseFloat(amt || '0')}
                  className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {t('buy_yes')}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {openPositions.length > 0 && (
        <section className="rounded-2xl border border-border bg-bg-1/30 p-4">
          <h3 className="text-sm font-medium text-fg-0">{t('open_positions')}</h3>
          <ul className="mt-3 space-y-2">
            {openPositions.map((pos) => {
              const market = markets.find((m) => m.id === pos.marketId);
              if (!market) return null;
              const mark = pos.shares * market.yesPrice;
              const cost = pos.shares * pos.avgPrice;
              const pnl = mark - cost;
              return (
                <li
                  key={pos.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-bg-0/40 px-3 py-2 text-sm"
                >
                  <span className="text-fg-1">{market.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-fg-2">
                      {pos.shares.toFixed(1)} @ {(pos.avgPrice * 100).toFixed(1)}¢
                    </span>
                    <span className={cn('font-mono text-xs', pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => wallet.sellYes(pos.id, market.yesPrice)}
                      className="rounded-md border border-border px-2 py-1 text-xs text-fg-2 hover:text-fg-0"
                    >
                      {t('sell')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
