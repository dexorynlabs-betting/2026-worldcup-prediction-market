import type { Team } from './types';
import { sampleScore } from './match';
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

/** Simulate a single knockout match. Coin flip on regulation-time draws (penalties). */
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
    if (rng.next() < 0.5) {
      winnerIdx = homeIdx; loserIdx = awayIdx;
    } else {
      winnerIdx = awayIdx; loserIdx = homeIdx;
    }
  }
  return { homeIdx, awayIdx, gh, ga, winnerIdx, loserIdx, drawn };
}
