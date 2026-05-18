'use client';

import { useMemo } from 'react';
import { Drawer } from 'vaul';
import { useLocale } from 'next-intl';
import { X } from 'lucide-react';
import { useSelection } from '@/hooks/useSelection';
import { Flag } from './Flag';
import { cn, formatPct } from '@/lib/utils';
import { getScorers } from '@/lib/sim/scorers';
import { TeamAbsencesPanel, AbsenceBadge } from './TeamAbsencesPanel';
import type { SerializedResult } from '@/lib/sim/worker';

interface Props { result: SerializedResult; }

export function TeamDetailDrawer({ result }: Props) {
  const locale = useLocale();
  const { selectedTeamId, closeTeam, openFixture } = useSelection();

  const teamIdx = useMemo(
    () => result.teams.findIndex((t) => t.id === selectedTeamId),
    [result, selectedTeamId],
  );
  const team = teamIdx >= 0 ? result.teams[teamIdx] : null;

  const data = useMemo(() => {
    if (!team) return null;
    const i = teamIdx;
    const N = result.numSimulations;
    const stages = result.stageCounts;

    // Derive per-outcome counts. stageCounts are cumulative — convert to disjoint.
    const champ = stages.champion[i];
    const final = stages.final[i];
    const sf    = stages.sf[i];
    const qf    = stages.qf[i];
    const r16   = stages.r16[i];
    const r32   = stages.r32[i];

    const wasChamp     = champ;
    const wasRunnerUp  = final - champ;
    const wasSF        = sf - final;     // lost in SF (could include 3rd/4th)
    const wasQF        = qf - sf;
    const wasR16       = r16 - qf;
    const wasR32       = r32 - r16;
    const outInGroups  = N - r32;

    const groupFirst   = result.groupFinish.first[i];
    const groupSecond  = result.groupFinish.second[i];
    const groupThirdAdv = result.groupFinish.thirdAdvances[i];
    const groupThirdOut = result.groupFinish.thirdOut[i];
    const groupFourth  = result.groupFinish.fourth[i];

    // ELO rank
    const sortedByElo = [...result.teams].sort((a, b) => b.elo - a.elo);
    const eloRank = sortedByElo.findIndex((t) => t.id === team.id) + 1;

    // Average goals
    const avgGF = result.totalGoalsFor[i] / N;
    const avgGA = result.totalGoalsAgainst[i] / N;

    // Top scorers for this team across all sims (excludes Otros)
    const myScorers = new Map<string, number>();
    for (const [k, v] of result.scorers) {
      if (k.startsWith(`${team.id}|`) && !k.endsWith('|Otros')) {
        myScorers.set(k.split('|')[1], v / N);
      }
    }
    const topScorers = Array.from(myScorers.entries()).sort((a, b) => b[1] - a[1]);

    return {
      wasChamp: wasChamp / N,
      wasRunnerUp: wasRunnerUp / N,
      wasSF: wasSF / N,
      wasQF: wasQF / N,
      wasR16: wasR16 / N,
      wasR32: wasR32 / N,
      outInGroups: outInGroups / N,
      groupFirst: groupFirst / N,
      groupSecond: groupSecond / N,
      groupThirdAdv: groupThirdAdv / N,
      groupThirdOut: groupThirdOut / N,
      groupFourth: groupFourth / N,
      eloRank,
      avgGF,
      avgGA,
      reachR32: r32 / N,
      reachR16: r16 / N,
      reachQF: qf / N,
      reachSF: sf / N,
      reachFinal: final / N,
      topScorers,
      group: findGroup(team.id),
      groupFixtures: findGroupFixtures(team.id, result),
    };
  }, [team, teamIdx, result]);

  const open = !!selectedTeamId && !!team && !!data;

  return (
    <Drawer.Root open={open} onClose={closeTeam} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col border-l border-border bg-bg-1/90 backdrop-blur-2xl outline-none">
          <Drawer.Title className="sr-only">Team details</Drawer.Title>
          {team && data && (
            <>
              <header className="flex items-start justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-4">
                  <Flag code={team.flag} size={56} />
                  <div>
                    <h2 className="font-display text-3xl font-bold text-fg-0">
                      {locale === 'es' ? team.name_es : team.name_en}
                    </h2>
                    <div className="mt-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                      <span>ELO <span className="text-fg-0 tabular">{team.elo}</span></span>
                      <AbsenceBadge teamId={team.id} />
                      <span>·</span>
                      <span>Rank #<span className="text-fg-0 tabular">{data.eloRank}</span></span>
                      {data.group && (<><span>·</span><span>Grupo <span className="text-fg-0">{data.group}</span></span></>)}
                    </div>
                  </div>
                </div>
                <button onClick={closeTeam} className="rounded-full p-2 text-fg-3 hover:bg-bg-2/60 hover:text-fg-0">
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                {/* Best/Worst case */}
                <section className="grid grid-cols-2 gap-3">
                  <BestWorstCard tone="gold" label="Probabilidad campeón" value={data.wasChamp} caption="Mejor caso" />
                  <BestWorstCard tone="rose" label="Fuera en fase de grupos" value={data.outInGroups} caption="Peor caso" />
                </section>

                {/* Stage probabilities */}
                <section>
                  <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                    Probabilidad de llegar a cada ronda
                  </h3>
                  <div className="space-y-1.5">
                    <StageBar label="Octavos (R32)" value={data.reachR32} />
                    <StageBar label="16vos (R16)"   value={data.reachR16} />
                    <StageBar label="Cuartos"        value={data.reachQF} />
                    <StageBar label="Semifinal"      value={data.reachSF} />
                    <StageBar label="Final"          value={data.reachFinal} />
                    <StageBar label="Campeón"        value={data.wasChamp} tone="gold" />
                  </div>
                </section>

                {/* Group finish distribution */}
                <section>
                  <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                    Posición de grupo
                  </h3>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <GroupCell label="1°"        value={data.groupFirst}    tone="emerald" />
                    <GroupCell label="2°"        value={data.groupSecond}   tone="emerald" />
                    <GroupCell label="3° (clasif.)" value={data.groupThirdAdv} tone="amber" />
                    <GroupCell label="3° (out)" value={data.groupThirdOut} tone="muted" />
                    <GroupCell label="4°"        value={data.groupFourth}   tone="muted" />
                  </div>
                </section>

                {/* Goals */}
                <section className="grid grid-cols-2 gap-3">
                  <StatBlock label="Goles esperados (GF)" value={data.avgGF.toFixed(2)} sub="promedio por torneo" tone="emerald" />
                  <StatBlock label="Goles esperados (GC)" value={data.avgGA.toFixed(2)} sub="promedio por torneo" tone="rose" />
                </section>

                {/* Current absences (injuries / suspensions) */}
                <TeamAbsencesPanel teamId={team.id} />

                {/* Top scorers */}
                {data.topScorers.length > 0 && (
                  <section>
                    <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                      Anotadores esperados <span className="text-fg-3">· aproximación</span>
                    </h3>
                    <ul className="space-y-1.5">
                      {data.topScorers.map(([name, goals]) => (
                        <li key={name} className="flex items-center justify-between rounded-lg border border-border bg-bg-2/30 px-3 py-2 text-sm">
                          <span className="text-fg-1">{name}</span>
                          <span className="font-mono tabular text-fg-0">{goals.toFixed(2)} goles</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Group matches */}
                {data.groupFixtures.length > 0 && (
                  <section>
                    <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                      Partidos de grupo
                    </h3>
                    <ul className="space-y-1.5">
                      {data.groupFixtures.map(({ key, opponent, opponentFlag, modal, prob }) => (
                        <li key={key}>
                          <button
                            onClick={() => openFixture(key)}
                            className="flex w-full items-center justify-between rounded-lg border border-border bg-bg-2/30 px-3 py-2 text-sm transition-colors hover:border-gold/40 hover:bg-bg-2/60"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-fg-3 text-xs">vs</span>
                              <Flag code={opponentFlag} size={18} />
                              <span className="text-fg-1">{opponent}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-xs tabular">
                              <span className="text-fg-0">{modal}</span>
                              <span className="text-fg-3">{prob}</span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <p className="text-[10px] text-fg-3 leading-relaxed">
                  Métricas sobre {result.numSimulations.toLocaleString()} simulaciones Monte Carlo del Mundial 2026.
                  Anotadores: aproximación goal-share, ver <a className="underline decoration-gold/40 underline-offset-2" href="/methodology">metodología</a>.
                </p>
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function findGroup(teamId: string): string | null {
  // Lazy import — small file, accessed only on drawer open.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const groupsData = require('@/data/groups.json') as { groups: Record<string, string[]> };
  for (const [letter, ids] of Object.entries(groupsData.groups)) {
    if (ids.includes(teamId)) return letter;
  }
  return null;
}

function findGroupFixtures(teamId: string, result: SerializedResult) {
  const letter = findGroup(teamId);
  if (!letter) return [];
  const fixtures = result.fixtures.filter(([k]) => k.startsWith(`${letter}:`));
  const out: Array<{ key: string; opponent: string; opponentFlag: string; modal: string; prob: string }> = [];
  for (const [key, f] of fixtures) {
    if (f.home !== teamId && f.away !== teamId) continue;
    const isHome = f.home === teamId;
    const opponentId = isHome ? f.away : f.home;
    const opponent = result.teams.find((t) => t.id === opponentId);
    if (!opponent) continue;
    // find modal score
    let bestIdx = 0, best = 0;
    for (let i = 0; i < 64; i++) {
      if (f.scoreHist[i] > best) { best = f.scoreHist[i]; bestIdx = i; }
    }
    const myH = Math.floor(bestIdx / 8);
    const myA = bestIdx % 8;
    const modal = isHome ? `${myH}-${myA}` : `${myA}-${myH}`;
    const winRate = isHome ? f.winsHome / f.count : f.winsAway / f.count;
    out.push({
      key,
      opponent: opponent.name_es,
      opponentFlag: opponent.flag,
      modal,
      prob: formatPct(winRate, 0),
    });
  }
  return out;
}

function BestWorstCard({ tone, label, value, caption }: { tone: 'gold' | 'rose'; label: string; value: number; caption: string }) {
  const colors = {
    gold: 'border-gold/40 bg-gradient-to-br from-gold/15 to-transparent',
    rose: 'border-rose/40 bg-gradient-to-br from-rose/10 to-transparent',
  } as const;
  return (
    <div className={cn('rounded-xl border p-4', colors[tone])}>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">{caption}</div>
      <div className="mt-1 text-xs text-fg-2">{label}</div>
      <div className={cn('mt-2 font-display text-3xl font-bold tabular', tone === 'gold' ? 'text-gold' : 'text-rose')}>
        {formatPct(value, 1)}
      </div>
    </div>
  );
}

function StageBar({ label, value, tone = 'emerald' }: { label: string; value: number; tone?: 'emerald' | 'gold' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-fg-2">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-bg-2/60">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value * 100}%`,
            background: tone === 'gold'
              ? 'linear-gradient(90deg, oklch(0.52 0.08 180), oklch(0.78 0.09 180))'
              : 'linear-gradient(90deg, oklch(0.55 0.18 155), oklch(0.72 0.17 155))',
          }}
        />
      </div>
      <span className="w-14 text-right font-mono text-xs tabular text-fg-0">{formatPct(value, 1)}</span>
    </div>
  );
}

function GroupCell({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'muted' }) {
  const colors = {
    emerald: 'text-emerald',
    amber:   'text-gold',
    muted:   'text-fg-3',
  } as const;
  return (
    <div className="rounded-lg border border-border bg-bg-2/30 p-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">{label}</div>
      <div className={cn('mt-1 font-mono text-sm tabular', colors[tone])}>{formatPct(value, 0)}</div>
    </div>
  );
}

function StatBlock({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'emerald' | 'rose' }) {
  return (
    <div className="rounded-xl border border-border bg-bg-2/30 p-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">{label}</div>
      <div className={cn('mt-2 font-display text-2xl font-bold tabular', tone === 'emerald' ? 'text-emerald' : 'text-rose')}>
        {value}
      </div>
      <div className="mt-1 text-[10px] text-fg-3">{sub}</div>
    </div>
  );
}
