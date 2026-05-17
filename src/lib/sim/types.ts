export interface Team {
  id: string;
  name_en: string;
  name_es: string;
  flag: string;
  elo: number;
  is_host: boolean;
}

export interface MatchResult {
  home: number;       // team index
  away: number;
  goals_home: number;
  goals_away: number;
  winner: number;     // team index that advances (winner via PK if drawn in knockout)
  drawn: boolean;     // true if regular-time draw (knockout — penalties decided it)
}

/**
 * Furthest knockout round a team participated in. Bronze-medal status is tracked
 * separately via `TournamentResult.thirdPlace` — it doesn't bump the stage value
 * because a 3rd-place finisher still topped out at SF (they lost there, then
 * won the 3rd-place playoff).
 */
export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'champion';

export interface TournamentResult {
  /** champion = team index that won the final */
  champion: number;
  /** runner-up index */
  runnerUp: number;
  /** third-place team index */
  thirdPlace: number;
  /** fourth-place team index */
  fourthPlace: number;
  /** for each team idx: the furthest stage they reached */
  stageReached: Stage[];
  /** total goals scored by each team across the tournament (regular time only) */
  goalsFor: Int32Array;
  /** total goals conceded by each team */
  goalsAgainst: Int32Array;
}

export interface AggregateResult {
  numSimulations: number;
  teams: Team[];
  /** for each team: number of times they reached each stage */
  stageCounts: {
    r32: Int32Array;
    r16: Int32Array;
    qf: Int32Array;
    sf: Int32Array;
    final: Int32Array;
    third: Int32Array;
    champion: Int32Array;
  };
  /** for each team: sum of goalsFor across all sims (use /N for avg per tournament) */
  totalGoalsFor: Float64Array;
  totalGoalsAgainst: Float64Array;
  /** for each team: number of times they finished 1st/2nd/3rd-advancing/3rd-out/4th in their group */
  groupFinish: {
    first: Int32Array;
    second: Int32Array;
    thirdAdvances: Int32Array;
    thirdOut: Int32Array;
    fourth: Int32Array;
  };
  /** histogram of total goals scored across the tournament (regular time, group + knockout) */
  tournamentGoalsHistogram: Int32Array;
}
