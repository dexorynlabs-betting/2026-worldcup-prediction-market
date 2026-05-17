import type { Team, AggregateResult } from './types';
import { XoshiroRNG } from './rng';
import { simulateTournament } from './tournament';

import teamsData from '@/data/teams.json';

export const TEAMS: Team[] = (teamsData as { teams: Team[] }).teams;
const TEAM_IDX = new Map(TEAMS.map((t, i) => [t.id, i] as const));

export interface RunOptions {
  numSimulations: number;
  seed?: number;
  onProgress?: (completed: number, total: number) => void;
  /** progress callback frequency in number of simulations */
  progressEvery?: number;
}

const MAX_TOURNAMENT_GOALS = 400; // upper bound for histogram bucket count

export function runSimulations(opts: RunOptions): AggregateResult {
  const N = opts.numSimulations;
  const teams = TEAMS;
  const T = teams.length;

  const rng = new XoshiroRNG(opts.seed ?? Date.now());

  const result: AggregateResult = {
    numSimulations: N,
    teams,
    stageCounts: {
      r32:      new Int32Array(T),
      r16:      new Int32Array(T),
      qf:       new Int32Array(T),
      sf:       new Int32Array(T),
      final:    new Int32Array(T),
      third:    new Int32Array(T),
      champion: new Int32Array(T),
    },
    totalGoalsFor: new Float64Array(T),
    totalGoalsAgainst: new Float64Array(T),
    groupFinish: {
      first:          new Int32Array(T),
      second:         new Int32Array(T),
      thirdAdvances:  new Int32Array(T),
      thirdOut:       new Int32Array(T),
      fourth:         new Int32Array(T),
    },
    tournamentGoalsHistogram: new Int32Array(MAX_TOURNAMENT_GOALS),
  };

  const progressEvery = opts.progressEvery ?? Math.max(500, Math.floor(N / 100));

  for (let sim = 0; sim < N; sim++) {
    const t = simulateTournament(teams, TEAM_IDX, rng);

    // accumulate stage counts: any team that reached stage X also reached all stages ≤ X.
    for (let i = 0; i < T; i++) {
      const s = t.stageReached[i];
      const reachedR32 = s !== 'group';
      const reachedR16 = reachedR32 && s !== 'r32';
      const reachedQF  = reachedR16 && s !== 'r16';
      const reachedSF  = reachedQF  && s !== 'qf';
      const reachedF   = reachedSF  && s !== 'sf';
      const reachedChamp = s === 'champion';
      if (reachedR32) result.stageCounts.r32[i]++;
      if (reachedR16) result.stageCounts.r16[i]++;
      if (reachedQF)  result.stageCounts.qf[i]++;
      if (reachedSF)  result.stageCounts.sf[i]++;
      if (reachedF)   result.stageCounts.final[i]++;
      if (reachedChamp) result.stageCounts.champion[i]++;
    }

    // 3rd-place finisher (winner of the 3rd-place playoff)
    result.stageCounts.third[t.thirdPlace]++;

    // goal totals
    let tournamentGoals = 0;
    for (let i = 0; i < T; i++) {
      result.totalGoalsFor[i] += t.goalsFor[i];
      result.totalGoalsAgainst[i] += t.goalsAgainst[i];
      tournamentGoals += t.goalsFor[i];
    }
    if (tournamentGoals < MAX_TOURNAMENT_GOALS) {
      result.tournamentGoalsHistogram[tournamentGoals]++;
    }

    if ((sim + 1) % progressEvery === 0 || sim === N - 1) {
      opts.onProgress?.(sim + 1, N);
    }
  }

  return result;
}

/** Convenience: compute per-team probabilities (sorted by champion % desc). */
export function championProbabilities(agg: AggregateResult): Array<{
  team: Team;
  pct: number;
  count: number;
}> {
  return agg.teams
    .map((team, i) => ({
      team,
      pct: agg.stageCounts.champion[i] / agg.numSimulations,
      count: agg.stageCounts.champion[i],
    }))
    .sort((a, b) => b.pct - a.pct);
}

export function stageProbabilityMatrix(agg: AggregateResult) {
  return agg.teams.map((team, i) => ({
    team,
    r32:     agg.stageCounts.r32[i] / agg.numSimulations,
    r16:     agg.stageCounts.r16[i] / agg.numSimulations,
    qf:      agg.stageCounts.qf[i] / agg.numSimulations,
    sf:      agg.stageCounts.sf[i] / agg.numSimulations,
    final:   agg.stageCounts.final[i] / agg.numSimulations,
    champ:   agg.stageCounts.champion[i] / agg.numSimulations,
    avgGF:   agg.totalGoalsFor[i] / agg.numSimulations,
    avgGA:   agg.totalGoalsAgainst[i] / agg.numSimulations,
  }));
}
