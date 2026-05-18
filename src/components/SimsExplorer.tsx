'use client';

import { useMemo, useState } from 'react';
import { cn, formatPct } from '@/lib/utils';
import { Flag } from './Flag';
import type { SerializedResult } from '@/lib/sim/worker';
import type { SampleSim } from '@/lib/sim/types';

interface Props {
  teamIdx: number;
  result: SerializedResult;
}

type Outcome =
  | 'champion'
  | 'runnerUp'
  | 'third'
  | 'fourth'
  | 'sf'
  | 'qf'
  | 'r16'
  | 'r32'
  | 'group';

const OUTCOME_ORDER: Outcome[] = ['champion', 'runnerUp', 'third', 'fourth', 'sf', 'qf', 'r16', 'r32', 'group'];
const OUTCOME_LABEL: Record<Outcome, string> = {
  champion: 'Campeón',
  runnerUp: 'Subcampeón',
  third: '3er puesto',
  fourth: '4to puesto',
  sf: 'Semis',
  qf: 'Cuartos',
  r16: '16vos',
  r32: '32vos',
  group: 'Fuera en grupos',
};
const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'] as const;
const STAGE_LABEL: Record<typeof STAGE_ORDER[number], string> = {
  group: 'Grupo',
  r32: '32vos',
  r16: '16vos',
  qf: 'Cuartos',
  sf: 'Semi',
  '3rd': '3er puesto',
  final: 'Final',
};

interface TeamMatch {
  stage: typeof STAGE_ORDER[number];
  slotId: string;
  opponentIdx: number;
  gf: number;
  ga: number;
  isHome: boolean;
  result: 'W' | 'L' | 'D';
}

interface TeamPath {
  sim: SampleSim;
  outcome: Outcome;
  matches: TeamMatch[];
}

function outcomeFor(sim: SampleSim, teamIdx: number, highestStage: typeof STAGE_ORDER[number] | null): Outcome {
  if (sim.champion === teamIdx) return 'champion';
  if (sim.runnerUp === teamIdx) return 'runnerUp';
  if (sim.thirdPlace === teamIdx) return 'third';
  if (sim.fourthPlace === teamIdx) return 'fourth';
  if (highestStage === 'sf' || highestStage === 'final') return 'sf';
  if (highestStage === 'qf') return 'qf';
  if (highestStage === 'r16') return 'r16';
  if (highestStage === 'r32') return 'r32';
  return 'group';
}

function buildPath(sim: SampleSim, teamIdx: number): TeamPath {
  const matches: TeamMatch[] = [];
  for (const m of sim.matches) {
    if (m.home !== teamIdx && m.away !== teamIdx) continue;
    const isHome = m.home === teamIdx;
    const gf = isHome ? m.gh : m.ga;
    const ga = isHome ? m.ga : m.gh;
    const opponentIdx = isHome ? m.away : m.home;
    const r: 'W' | 'L' | 'D' = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    matches.push({ stage: m.stage, slotId: m.slotId, opponentIdx, gf, ga, isHome, result: r });
  }
  matches.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const highest = matches.length === 0
    ? null
    : matches[matches.length - 1].stage;
  return { sim, outcome: outcomeFor(sim, teamIdx, highest), matches };
}

export function SimsExplorer({ teamIdx, result }: Props) {
  const paths = useMemo(
    () => result.sampleSims.map((s) => buildPath(s, teamIdx)),
    [result.sampleSims, teamIdx],
  );

  // Bucket counts by outcome
  const buckets = useMemo(() => {
    const map = new Map<Outcome, TeamPath[]>();
    for (const o of OUTCOME_ORDER) map.set(o, []);
    for (const p of paths) map.get(p.outcome)!.push(p);
    return map;
  }, [paths]);

  const total = paths.length;
  if (total === 0) return null;

  const [selected, setSelected] = useState<Outcome | null>(() => {
    // Default to the highest non-empty bucket so the user sees something interesting first.
    for (const o of OUTCOME_ORDER) {
      if ((buckets.get(o)?.length ?? 0) > 0) return o;
    }
    return null;
  });
  const [expanded, setExpanded] = useState<number | null>(null);

  const selectedPaths = selected ? buckets.get(selected) ?? [] : [];

  return (
    <section>
      <h3 className="mb-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
        <span>Explorar simulaciones <span className="text-fg-3">· {total} muestreadas de {result.numSimulations.toLocaleString()}</span></span>
      </h3>

      <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {OUTCOME_ORDER.map((o) => {
          const n = buckets.get(o)?.length ?? 0;
          if (n === 0) return null;
          const pct = n / total;
          const isSel = selected === o;
          return (
            <button
              key={o}
              onClick={() => { setSelected(o); setExpanded(null); }}
              className={cn(
                'relative overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-colors',
                isSel
                  ? 'border-gold/50 bg-gold/10'
                  : 'border-border bg-bg-2/30 hover:border-border-strong hover:bg-bg-2/50',
              )}
            >
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-3">{OUTCOME_LABEL[o]}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className={cn('font-display text-lg font-bold tabular', isSel ? 'text-gold' : 'text-fg-0')}>{n}</span>
                <span className="font-mono text-[10px] tabular text-fg-3">{formatPct(pct, 0)}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-bg-2/50">
                <div
                  className={cn('h-full', isSel ? 'bg-gold' : 'bg-emerald/60')}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-1.5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">
            {selectedPaths.length} simulación{selectedPaths.length === 1 ? '' : 'es'} · {OUTCOME_LABEL[selected]}
            <span className="ml-2 text-fg-3">· click para ver detalle</span>
          </div>
          {selectedPaths.slice(0, 50).map((p, i) => {
            const isExpanded = expanded === p.sim.simIdx;
            return (
              <div
                key={p.sim.simIdx}
                className={cn(
                  'rounded-lg border transition-colors',
                  isExpanded ? 'border-gold/40 bg-bg-2/40' : 'border-border bg-bg-2/20 hover:bg-bg-2/40',
                )}
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  onClick={() => setExpanded(isExpanded ? null : p.sim.simIdx)}
                >
                  <span className="w-10 font-mono text-[10px] tabular text-fg-3">#{i + 1}</span>
                  <div className="flex-1 overflow-hidden">
                    <PathChain matches={p.matches} teams={result.teams} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/40 px-3 py-2">
                    <ul className="space-y-1">
                      {p.matches.map((m, idx) => {
                        const opp = result.teams[m.opponentIdx];
                        const tone =
                          m.result === 'W' ? 'text-emerald'
                            : m.result === 'L' ? 'text-rose'
                              : 'text-amber-300';
                        return (
                          <li key={idx} className="flex items-center gap-2 font-mono text-xs">
                            <span className="w-14 text-[9px] uppercase tracking-[0.12em] text-fg-3">
                              {STAGE_LABEL[m.stage]}
                            </span>
                            <span className="flex items-center gap-1.5 text-fg-2">
                              <Flag code={opp.flag} size={14} />
                              <span>vs {opp.name_es}</span>
                            </span>
                            <span className={cn('ml-auto tabular', tone)}>
                              {m.gf}–{m.ga}
                            </span>
                            <span className="w-4 text-center font-mono text-[9px] uppercase">
                              {m.result}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
          {selectedPaths.length > 50 && (
            <p className="pt-1 text-[10px] text-fg-3">
              {selectedPaths.length - 50} simulaciones más no se muestran (limit 50).
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] text-fg-3 leading-relaxed">
        Muestra de simulaciones completas del Monte Carlo de {result.numSimulations.toLocaleString()} torneos. Cada barra de probabilidad arriba se construye con todas las {result.numSimulations.toLocaleString()}, este panel deja inspeccionar trayectorias individuales.
      </p>
    </section>
  );
}

/**
 * Compact horizontal flag chain showing the team's path through the tournament.
 * Each opponent shows up with mini-flag + score with W/L/D color cue.
 */
function PathChain({ matches, teams }: { matches: TeamMatch[]; teams: SerializedResult['teams'] }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
      {matches.map((m, idx) => {
        const opp = teams[m.opponentIdx];
        const tone =
          m.result === 'W' ? 'border-emerald/40 bg-emerald/10 text-emerald'
            : m.result === 'L' ? 'border-rose/40 bg-rose/10 text-rose'
              : 'border-amber-400/40 bg-amber-400/10 text-amber-300';
        return (
          <span
            key={idx}
            className={cn(
              'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] tabular',
              tone,
            )}
            title={`${STAGE_LABEL[m.stage]} · vs ${opp.name_es}`}
          >
            <Flag code={opp.flag} size={12} />
            <span>{m.gf}-{m.ga}</span>
          </span>
        );
      })}
    </div>
  );
}
