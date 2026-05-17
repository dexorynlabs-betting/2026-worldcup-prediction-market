import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { runBacktest, type CalibrationBucket, type ScoredMatch } from '@/lib/sim/backtest';
import { cn } from '@/lib/utils';

export const dynamic = 'force-static';

export default async function BacktestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const r = runBacktest();

  return (
    <article className="relative mx-auto max-w-[1100px] px-6 pt-32 pb-32">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-fg-3 transition-colors hover:text-fg-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al simulador
      </Link>

      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-gold/90">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          VALIDACIÓN HISTÓRICA
        </div>
        <h1 className="mt-5 font-display text-5xl font-bold tracking-tight text-fg-0 sm:text-6xl">
          Backtest
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-fg-1">
          Aplicamos el modelo actual a los Mundiales{' '}
          <span className="text-fg-0 font-medium">2014, 2018 y 2022</span> usando el ELO de fin del año
          anterior y los 192 resultados de tiempo regular. Lo que sigue es honesto, no es marketing.
        </p>
      </header>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Brier score"
          value={r.overall.brier.toFixed(3)}
          tone={r.overall.brier < 0.55 ? 'good' : r.overall.brier < 0.62 ? 'mid' : 'bad'}
          subtitle="menor = mejor · random 0.667"
        />
        <Stat
          label="Log loss"
          value={r.overall.logLoss.toFixed(3)}
          tone={r.overall.logLoss < 0.95 ? 'good' : r.overall.logLoss < 1.05 ? 'mid' : 'bad'}
          subtitle="menor = mejor · random 1.099"
        />
        <Stat
          label="Accuracy top-1"
          value={(r.overall.accuracy * 100).toFixed(1) + '%'}
          tone={r.overall.accuracy > 0.6 ? 'good' : r.overall.accuracy > 0.5 ? 'mid' : 'bad'}
          subtitle={`${r.overall.count} partidos · random 33%`}
        />
      </section>

      <Section title="Por torneo">
        <div className="overflow-x-auto rounded-2xl border border-border glass">
          <table className="min-w-full">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-fg-3 font-mono">
              <tr>
                <th className="px-4 py-3 text-left">Mundial</th>
                <th className="px-3 py-3 text-right">N</th>
                <th className="px-3 py-3 text-right">Brier</th>
                <th className="px-3 py-3 text-right">Log loss</th>
                <th className="px-3 py-3 text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {r.perTournament.map((t) => (
                <tr key={t.year} className="border-t border-border/40">
                  <td className="px-4 py-2.5 text-sm text-fg-1">
                    <span className="font-medium text-fg-0">{t.year}</span>{' '}
                    <span className="text-fg-3">· {t.host}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-2">{t.aggregate.count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-0">{t.aggregate.brier.toFixed(3)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-0">{t.aggregate.logLoss.toFixed(3)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-0">{(t.aggregate.accuracy * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Por etapa">
        <div className="overflow-x-auto rounded-2xl border border-border glass">
          <table className="min-w-full">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-fg-3 font-mono">
              <tr>
                <th className="px-4 py-3 text-left">Etapa</th>
                <th className="px-3 py-3 text-right">N</th>
                <th className="px-3 py-3 text-right">Brier</th>
                <th className="px-3 py-3 text-right">Log loss</th>
                <th className="px-3 py-3 text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {(['group', 'r16', 'qf', 'sf', '3rd', 'final'] as const).map((s) => {
                const a = r.perStage[s];
                if (a.count === 0) return null;
                return (
                  <tr key={s} className="border-t border-border/40">
                    <td className="px-4 py-2.5 text-sm text-fg-1">{STAGE_LABEL[s]}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-2">{a.count}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-0">{a.brier.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-0">{a.logLoss.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-0">{(a.accuracy * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fg-3">
          El modelo es más sólido en fase de grupos (más muestras, ELO gap más decisivo) y se degrada en
          KO tardío donde los rivales tienen ELO parecido y la varianza Poisson domina.
        </p>
      </Section>

      <Section title="Calibración">
        <p className="mb-4 text-sm text-fg-2">
          Cuando el modelo dice <span className="text-fg-1">"X% de probabilidad"</span>, ¿la frecuencia
          observada coincide? La diagonal punteada es la calibración perfecta — cuanto más cerca, mejor.
        </p>
        <CalibrationPlot buckets={r.calibration} />
      </Section>

      <Section title="Peores predicciones — el modelo no vio venir">
        <MissList matches={r.worstMisses} kind="miss" />
        <p className="mt-3 text-xs leading-relaxed text-fg-3">
          Estos son los batacazos históricos. El modelo les asignó probabilidad muy baja y igual ocurrieron.
          La frecuencia con la que pasan vs lo que predijimos es donde está la mayor deuda — el Tier 1
          (peso al último año, lesiones, host bonus reforzado) ataca exactamente esto.
        </p>
      </Section>

      <Section title="Mejores predicciones — donde el ELO se impone">
        <MissList matches={r.bestCalls} kind="call" />
      </Section>

      <Section title="Cómo leer esto">
        <ul className="space-y-3 text-fg-1 leading-relaxed">
          <Bullet>
            <strong>Brier score</strong> mide el error cuadrático medio del vector de probabilidades.
            0 = predicción perfecta, 0.667 = predicción uniforme (random). Nuestro {r.overall.brier.toFixed(2)} significa{' '}
            que el modelo aporta señal real, pero deja plata sobre la mesa.
          </Bullet>
          <Bullet>
            <strong>Log loss</strong> penaliza más las predicciones confiadas y equivocadas. Es la métrica
            estándar en competencias de prediction markets. {r.overall.logLoss.toFixed(2)} ubica al modelo
            entre "pick favorite" y "modelo serio bien calibrado".
          </Bullet>
          <Bullet>
            <strong>Accuracy top-1</strong> = en qué % de partidos la clase con más probabilidad fue la que
            ocurrió. {(r.overall.accuracy * 100).toFixed(0)}% no parece mucho pero hay que recordar que
            "draw" es difícil de pronosticar (3 outcomes, no 2) y que en {(r.overall.count)} partidos el sesgo
            del torneo (presión, contraataques) le da chance al underdog.
          </Bullet>
          <Bullet>
            <strong>Por qué backtest sobre el regulation-time</strong>: nuestro modelo Poisson predice goles
            en 90 minutos. Los partidos definidos en alargue/penales se cuentan como empate al final del
            tiempo regular — que es exactamente lo que el modelo predice.
          </Bullet>
          <Bullet>
            <strong>Lo que NO incluye este backtest</strong>: predicciones a nivel torneo (probabilidad de
            campeón) — requiere correr el bracket de 32 equipos. Lo agregamos en Tier 1.5 cuando esté
            implementado el formato viejo del Mundial.
          </Bullet>
        </ul>
      </Section>

      <footer className="mt-16 border-t border-border pt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
        Datos · ELO de eloratings.net (snapshot fin de año previo) · Resultados de openfootball/worldcup.json
      </footer>
    </article>
  );
}

const STAGE_LABEL: Record<string, string> = {
  group: 'Fase de grupos',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semis',
  '3rd': 'Tercer puesto',
  final: 'Final',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-fg-0">{title}</h2>
      <div className="mt-5 space-y-1">{children}</div>
    </section>
  );
}

function Stat({ label, value, subtitle, tone }: { label: string; value: string; subtitle: string; tone: 'good' | 'mid' | 'bad' }) {
  return (
    <div className={cn(
      'rounded-2xl border p-6 glass',
      tone === 'good' && 'border-emerald/30',
      tone === 'mid' && 'border-gold/30',
      tone === 'bad' && 'border-rose/30',
    )}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">{label}</div>
      <div className={cn(
        'mt-2 font-display text-4xl font-bold tabular',
        tone === 'good' && 'text-emerald',
        tone === 'mid' && 'text-gold',
        tone === 'bad' && 'text-rose',
      )}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] text-fg-3">{subtitle}</div>
    </div>
  );
}

function CalibrationPlot({ buckets }: { buckets: CalibrationBucket[] }) {
  const W = 320, H = 320, PAD = 30;
  const x = (p: number) => PAD + p * (W - 2 * PAD);
  const y = (p: number) => H - PAD - p * (H - 2 * PAD);

  return (
    <div className="rounded-2xl border border-border glass p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-[320px] w-full max-w-[400px]">
        {/* axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="oklch(0.34 0.04 180)" strokeWidth={1} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="oklch(0.34 0.04 180)" strokeWidth={1} />
        {/* perfect calibration diagonal */}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="oklch(0.46 0.02 180)" strokeWidth={1} strokeDasharray="3 3" />
        {/* axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <text x={x(t)} y={H - PAD + 14} fontSize={9} fontFamily="JetBrains Mono, monospace" fill="oklch(0.62 0.018 180)" textAnchor="middle">{(t * 100).toFixed(0)}%</text>
            <text x={PAD - 6} y={y(t) + 3} fontSize={9} fontFamily="JetBrains Mono, monospace" fill="oklch(0.62 0.018 180)" textAnchor="end">{(t * 100).toFixed(0)}%</text>
          </g>
        ))}
        {/* axis titles */}
        <text x={W / 2} y={H - 4} fontSize={10} fontFamily="JetBrains Mono, monospace" fill="oklch(0.46 0.02 180)" textAnchor="middle">predicho</text>
        <text x={10} y={H / 2} fontSize={10} fontFamily="JetBrains Mono, monospace" fill="oklch(0.46 0.02 180)" textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`}>observado</text>
        {/* points + segments */}
        {buckets.filter((b) => b.count > 0).map((b, i) => {
          const r = Math.max(3, Math.min(12, Math.sqrt(b.count) * 0.6));
          return (
            <g key={i}>
              <circle cx={x(b.predicted)} cy={y(b.observed)} r={r} fill="oklch(0.66 0.10 180 / 0.7)" stroke="oklch(0.66 0.10 180)" strokeWidth={1} />
            </g>
          );
        })}
      </svg>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
        Cada bola es un bucket. Tamaño ∝ √(n samples).
      </p>
    </div>
  );
}

function MissList({ matches, kind }: { matches: ScoredMatch[]; kind: 'miss' | 'call' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border glass">
      <table className="min-w-full">
        <thead className="text-[10px] uppercase tracking-[0.18em] text-fg-3 font-mono">
          <tr>
            <th className="px-4 py-3 text-left">Mundial</th>
            <th className="px-3 py-3 text-left">Etapa</th>
            <th className="px-4 py-3 text-left">Partido</th>
            <th className="px-3 py-3 text-right">Predicha</th>
            <th className="px-3 py-3 text-right">P(resultado real)</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => {
            const pVec = [m.pred.pHome, m.pred.pDraw, m.pred.pAway];
            const predicted = ['home', 'draw', 'away'][m.predictedClass];
            const PRED_LABEL: Record<string, string> = { home: m.home, draw: 'empate', away: m.away };
            const actualResult = m.gh > m.ga ? `gana ${m.home}` : m.gh === m.ga ? 'empate' : `gana ${m.away}`;
            return (
              <tr key={i} className="border-t border-border/40">
                <td className="px-4 py-2.5 font-mono text-xs text-fg-2 tabular">{m.year}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-3">{m.stage}</td>
                <td className="px-4 py-2.5 text-sm">
                  <span className={cn('font-medium', m.gh > m.ga ? 'text-fg-0' : 'text-fg-2')}>{m.home}</span>
                  <span className="mx-2 font-mono text-xs tabular text-fg-1">{m.gh} - {m.ga}</span>
                  <span className={cn('font-medium', m.ga > m.gh ? 'text-fg-0' : 'text-fg-2')}>{m.away}</span>
                  <span className="ml-3 font-mono text-[10px] text-fg-3">→ {actualResult}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-fg-2">
                  {PRED_LABEL[predicted]} ({(Math.max(...pVec) * 100).toFixed(0)}%)
                </td>
                <td className={cn(
                  'px-3 py-2.5 text-right font-mono text-xs tabular font-medium',
                  kind === 'miss' ? 'text-rose' : 'text-emerald',
                )}>
                  {(m.pActual * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-fg-1">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
      <span>{children}</span>
    </li>
  );
}
