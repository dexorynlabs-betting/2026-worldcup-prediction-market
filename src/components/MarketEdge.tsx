'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Flag } from './Flag';
import { cn, formatPct } from '@/lib/utils';
import { buildEdgeTable, type MarketOdds, type MarketOddsFile } from '@/lib/sim/market';
import marketOddsData from '@/data/market-odds.json';
import type { SerializedResult } from '@/lib/sim/worker';

interface Props { result: SerializedResult; }

const FILE = marketOddsData as unknown as MarketOddsFile;

export function MarketEdge({ result }: Props) {
  const locale = useLocale();
  const teamById = useMemo(() => new Map(result.teams.map((t) => [t.id, t])), [result]);

  const rows = useMemo(() => {
    const ourProbByTeamId = (market: MarketOdds['market'], teamId: string): number | undefined => {
      const idx = result.teams.findIndex((t) => t.id === teamId);
      if (idx < 0) return undefined;
      const N = result.numSimulations;
      switch (market) {
        case 'winner':   return result.stageCounts.champion[idx] / N;
        case 'finalist': return result.stageCounts.final[idx] / N;
        case 'top4':     return result.stageCounts.sf[idx] / N;
        default:         return undefined;
      }
    };
    return buildEdgeTable(FILE.odds as MarketOdds[], ourProbByTeamId);
  }, [result]);

  const hasOdds = FILE.odds.length > 0;

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-20">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-fg-0 sm:text-5xl">
            Edge vs mercado
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-fg-2">
            Comparamos nuestra probabilidad MC con la implícita devigueada de bookies y mercados
            de predicción. EV positivo = el modelo cree que la apuesta es rentable a largo plazo.
            <strong className="text-rose"> No es asesoría financiera.</strong>
          </p>
        </div>
        {hasOdds && (
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
            {FILE._meta.sources.join(' · ')}
          </div>
        )}
      </header>

      {!hasOdds ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-1/30 p-10 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              Odds aún no recolectadas
            </div>
            <h3 className="font-display text-2xl font-bold text-fg-0">Conecta una fuente de mercado</h3>
            <p className="text-sm text-fg-2">
              Para activar esta sección, configurá <code className="rounded bg-bg-2/60 px-1 py-0.5 font-mono text-xs">ODDS_API_KEY</code> (the-odds-api.com)
              o <code className="rounded bg-bg-2/60 px-1 py-0.5 font-mono text-xs">POLYMARKET_SLUG</code> en <code className="rounded bg-bg-2/60 px-1 py-0.5 font-mono text-xs">.env.local</code> y corré:
            </p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-bg-2/40 px-4 py-2 text-left font-mono text-xs text-fg-1">
              npm run fetch-odds
            </pre>
            <p className="text-xs text-fg-3">
              Una vez populado <code>src/data/market-odds.json</code>, esta tabla muestra automáticamente
              edge (nuestra prob − fair_prob del mercado) y EV por unidad para cada equipo y casa de apuestas.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border glass">
          <table className="min-w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-fg-3 font-mono">
                <th className="px-4 py-3 text-left">Mercado</th>
                <th className="px-4 py-3 text-left">Equipo</th>
                <th className="px-3 py-3 text-right">Cuota</th>
                <th className="px-3 py-3 text-right">Book</th>
                <th className="px-3 py-3 text-right">Fair</th>
                <th className="px-3 py-3 text-right">Nuestra</th>
                <th className="px-3 py-3 text-right">Edge</th>
                <th className="px-3 py-3 text-right">EV /u</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const team = teamById.get(r.team_id);
                if (!team) return null;
                const positive = r.edge > 0;
                return (
                  <tr key={`${r.market}-${r.team_id}-${r.book}-${i}`}
                      className={cn('border-t border-border/40', positive && 'bg-emerald-lo/5')}>
                    <td className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                      {r.market}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Flag code={team.flag} size={18} />
                        <span className="text-sm text-fg-1">
                          {locale === 'es' ? team.name_es : team.name_en}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular text-fg-0">
                      {r.decimal_odds.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-fg-2">{r.book}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular text-fg-2">
                      {formatPct(r.fair_prob, 1)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular text-fg-0">
                      {formatPct(r.our_prob, 1)}
                    </td>
                    <td className={cn(
                      'px-3 py-2 text-right font-mono text-xs tabular',
                      positive ? 'text-emerald' : 'text-rose',
                    )}>
                      {positive ? '+' : ''}{formatPct(r.edge, 1)}
                    </td>
                    <td className={cn(
                      'px-3 py-2 text-right font-mono text-xs tabular font-bold',
                      r.ev > 0 ? 'text-emerald' : 'text-fg-3',
                    )}>
                      {r.ev > 0 ? '+' : ''}{r.ev.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-fg-3">
        Disclaimer: edge positivo no garantiza ganancia. El modelo captura nivel histórico (ELO) pero NO
        modela lesiones, forma reciente, cambios de DT, ni el sentiment del mercado. La casa cobra margen
        (vig), nosotros lo restamos proporcionalmente para calcular el "fair_prob". Esto es análisis estadístico,
        no consejo financiero. Apostá lo que puedas perder.
      </p>
    </section>
  );
}
