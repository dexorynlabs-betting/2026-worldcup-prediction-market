/**
 * Match-level backtest engine.
 *
 * Given pre-tournament ELO and historical match results from WCs 2014/2018/2022,
 * computes per-match predicted probabilities under the current model
 * (ELO + Poisson + host bonus) and aggregates calibration metrics.
 *
 * We score MATCHES, not full tournaments — running the full bracket would
 * require a 32-team engine variant. The match predictor is the atomic
 * operation of the simulator, so its calibration is what matters first.
 *
 * Metrics:
 *   - Brier score (multi-class, lower is better): mean squared error
 *     between predicted probability vector and one-hot observed outcome,
 *     summed over the 3 classes (home/draw/away). Range [0, 2].
 *   - Log loss: −mean(log p_observed). Lower is better. Penalizes
 *     overconfident wrong predictions.
 *   - Top-1 accuracy: fraction of matches where the highest-probability
 *     outcome matches the actual result.
 *
 * Reference values for a 3-class football model:
 *   Random uniform     Brier 0.667  LogLoss 1.099  Acc 33%
 *   Pick favorite only Brier 0.55   LogLoss 0.99   Acc 50%
 *   Solid model (SPI)  Brier 0.45   LogLoss 0.95   Acc 58%
 *   Market consensus   Brier 0.42   LogLoss 0.90   Acc 60%
 */

import { lambdaFor } from './goals';
import { HOST_BONUS } from './elo';
import backtestData from '@/data/backtest.json';

const MAX_GOALS = 8;  // P(>8 goals at λ=3) ≈ 0.001 — negligible

type Stage = 'group' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';

interface RawMatch {
  date: string;
  stage: Stage;
  home: string;
  away: string;
  gh: number;
  ga: number;
}

interface RawTournament {
  year: number;
  host_id: string;
  host_name: string;
  elo: Record<string, number>;
  matches: RawMatch[];
}

interface BacktestFile {
  _meta: { sources: string[]; fetched_at: string; note: string };
  tournaments: RawTournament[];
}

/** Poisson PMF — small λ regime, no overflow concerns at k ≤ 8. */
function poissonPMF(k: number, lambda: number): number {
  // P(k; λ) = e^(-λ) * λ^k / k!
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

export interface MatchPrediction {
  /** Probability home team wins in regulation. */
  pHome: number;
  /** Probability of regulation draw. */
  pDraw: number;
  /** Probability away team wins in regulation. */
  pAway: number;
  lambdaHome: number;
  lambdaAway: number;
}

export function predictMatch(
  eloHome: number, eloAway: number,
  homeBonus: number, awayBonus: number,
): MatchPrediction {
  const lambdaHome = lambdaFor(eloHome, eloAway, homeBonus);
  const lambdaAway = lambdaFor(eloAway, eloHome, awayBonus);

  // Precompute PMFs once each.
  const pH = new Array(MAX_GOALS + 1);
  const pA = new Array(MAX_GOALS + 1);
  for (let k = 0; k <= MAX_GOALS; k++) {
    pH[k] = poissonPMF(k, lambdaHome);
    pA[k] = poissonPMF(k, lambdaAway);
  }

  let pHome = 0, pDraw = 0, pAway = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const joint = pH[h] * pA[a];
      if (h > a) pHome += joint;
      else if (h === a) pDraw += joint;
      else pAway += joint;
    }
  }
  // Renormalize for the truncated tail (>MAX_GOALS).
  const norm = pHome + pDraw + pAway;
  return {
    pHome: pHome / norm,
    pDraw: pDraw / norm,
    pAway: pAway / norm,
    lambdaHome,
    lambdaAway,
  };
}

export interface ScoredMatch {
  date: string;
  year: number;
  stage: Stage;
  home: string;
  away: string;
  gh: number;
  ga: number;
  pred: MatchPrediction;
  /** 0 = home win, 1 = draw, 2 = away win. */
  observedClass: 0 | 1 | 2;
  brier: number;
  logLoss: number;
  /** Probability the model assigned to the actual result. */
  pActual: number;
  predictedClass: 0 | 1 | 2;
}

export interface Aggregate {
  count: number;
  brier: number;
  logLoss: number;
  accuracy: number;
}

export interface CalibrationBucket {
  /** Center of the bucket (predicted prob). */
  predicted: number;
  /** Mean observed frequency of the predicted class in this bucket. */
  observed: number;
  count: number;
}

export interface BacktestResult {
  perTournament: Array<{ year: number; host: string; aggregate: Aggregate }>;
  overall: Aggregate;
  perStage: Record<Stage, Aggregate>;
  calibration: CalibrationBucket[];
  /** Largest model misses — predicted very low for what actually happened. */
  worstMisses: ScoredMatch[];
  /** Best calls — model assigned high probability to actual outcome. */
  bestCalls: ScoredMatch[];
  scored: ScoredMatch[];
}

function scoreMatch(m: RawMatch, year: number, hostId: string, elo: Record<string, number>): ScoredMatch | null {
  const eloH = elo[m.home];
  const eloA = elo[m.away];
  if (eloH === undefined || eloA === undefined) return null;

  // Host bonus matches engine rule: only in group stage, only if team is host.
  const bonusH = m.stage === 'group' && m.home === hostId ? HOST_BONUS : 0;
  const bonusA = m.stage === 'group' && m.away === hostId ? HOST_BONUS : 0;

  const pred = predictMatch(eloH, eloA, bonusH, bonusA);
  const observedClass: 0 | 1 | 2 = m.gh > m.ga ? 0 : m.gh === m.ga ? 1 : 2;
  const pVec = [pred.pHome, pred.pDraw, pred.pAway];
  const pActual = pVec[observedClass];

  // Multi-class Brier: Σ (p_c − y_c)^2
  let brier = 0;
  for (let c = 0; c < 3; c++) {
    const y = c === observedClass ? 1 : 0;
    brier += (pVec[c] - y) ** 2;
  }
  // Log loss for the observed class only (with small floor to avoid -Infinity).
  const logLoss = -Math.log(Math.max(pActual, 1e-9));
  const predictedClass = (pVec.indexOf(Math.max(...pVec))) as 0 | 1 | 2;

  return {
    date: m.date,
    year, stage: m.stage,
    home: m.home, away: m.away,
    gh: m.gh, ga: m.ga,
    pred, observedClass, brier, logLoss, pActual, predictedClass,
  };
}

function aggregate(scored: ScoredMatch[]): Aggregate {
  if (scored.length === 0) return { count: 0, brier: 0, logLoss: 0, accuracy: 0 };
  const n = scored.length;
  const sumBrier = scored.reduce((s, m) => s + m.brier, 0);
  const sumLog = scored.reduce((s, m) => s + m.logLoss, 0);
  const correct = scored.filter((m) => m.predictedClass === m.observedClass).length;
  return {
    count: n,
    brier: sumBrier / n,
    logLoss: sumLog / n,
    accuracy: correct / n,
  };
}

function buildCalibration(scored: ScoredMatch[]): CalibrationBucket[] {
  const N_BUCKETS = 10;
  const buckets: Array<{ totalPred: number; totalObs: number; count: number }> = [];
  for (let i = 0; i < N_BUCKETS; i++) {
    buckets.push({ totalPred: 0, totalObs: 0, count: 0 });
  }
  // For each match, accumulate a sample per (class, predicted_prob, observed_indicator).
  for (const m of scored) {
    const pVec = [m.pred.pHome, m.pred.pDraw, m.pred.pAway];
    for (let c = 0; c < 3; c++) {
      const p = pVec[c];
      const obs = c === m.observedClass ? 1 : 0;
      const bucket = Math.min(N_BUCKETS - 1, Math.floor(p * N_BUCKETS));
      buckets[bucket].totalPred += p;
      buckets[bucket].totalObs += obs;
      buckets[bucket].count += 1;
    }
  }
  return buckets.map((b, i) => ({
    predicted: b.count > 0 ? b.totalPred / b.count : (i + 0.5) / N_BUCKETS,
    observed: b.count > 0 ? b.totalObs / b.count : 0,
    count: b.count,
  }));
}

export function runBacktest(): BacktestResult {
  const file = backtestData as unknown as BacktestFile;
  const scored: ScoredMatch[] = [];
  const perTournament: BacktestResult['perTournament'] = [];

  for (const t of file.tournaments) {
    const tScored: ScoredMatch[] = [];
    for (const m of t.matches) {
      const s = scoreMatch(m, t.year, t.host_id, t.elo);
      if (s) tScored.push(s);
    }
    scored.push(...tScored);
    perTournament.push({ year: t.year, host: t.host_name, aggregate: aggregate(tScored) });
  }

  const perStage = {} as Record<Stage, Aggregate>;
  for (const stage of ['group', 'r16', 'qf', 'sf', '3rd', 'final'] as Stage[]) {
    perStage[stage] = aggregate(scored.filter((s) => s.stage === stage));
  }

  // Worst misses: highest logLoss (= lowest p for the actual outcome).
  const worstMisses = [...scored].sort((a, b) => b.logLoss - a.logLoss).slice(0, 8);
  const bestCalls = [...scored].sort((a, b) => a.logLoss - b.logLoss).slice(0, 8);

  return {
    perTournament,
    overall: aggregate(scored),
    perStage,
    calibration: buildCalibration(scored),
    worstMisses,
    bestCalls,
    scored,
  };
}
