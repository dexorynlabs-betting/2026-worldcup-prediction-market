import type { Team } from './types';
import { sampleScore } from './match';
import { shootoutWinProb } from './penalties';
import type { XoshiroRNG } from './rng';

export interface KnockoutMatch {
  homeIdx: number;
  awayIdx: number;
  gh: number;
  ga: number;
  winnerIdx: number;
  loserIdx: number;
  drawn: boolean;     // true if penalties decided it
}

/**
 * Simulate a single knockout match.
 *
 * On a 0-0 regulation draw, the winner is decided by a shoot-out: we sample
 * Bernoulli with probability `shootoutWinProb(homeId, awayId)` from the
 * Empirical Bayes shrinkage model (see penalties.ts). Teams with no
 * shoot-out history default to 50/50.
 */
export function simulateKnockout(
  homeIdx: number,
  awayIdx: number,
  teams: Team[],
  rng: XoshiroRNG,
): KnockoutMatch {
  const { ga: gh, gb: ga } = sampleScore(teams[homeIdx], teams[awayIdx], rng, true);
  let winnerIdx: number;
  let loserIdx: number;
  let drawn = false;
  if (gh > ga) {
    winnerIdx = homeIdx; loserIdx = awayIdx;
  } else if (gh < ga) {
    winnerIdx = awayIdx; loserIdx = homeIdx;
  } else {
    drawn = true;
    const pHome = shootoutWinProb(teams[homeIdx].id, teams[awayIdx].id);
    if (rng.next() < pHome) {
      winnerIdx = homeIdx; loserIdx = awayIdx;
    } else {
      winnerIdx = awayIdx; loserIdx = homeIdx;
    }
  }
  return { homeIdx, awayIdx, gh, ga, winnerIdx, loserIdx, drawn };
}
