import type { Team } from './types';
import { HOST_BONUS } from './elo';
import { lambdaFor, samplePoisson } from './goals';
import type { XoshiroRNG } from './rng';

/**
 * Decide host-side bonus when the "home" team (per the fixture) is a host nation.
 * Hosts: USA, Mexico, Canada. They play their group matches on home soil.
 *
 * Simplified rule: host team gets +100 in any of its matches; non-host opponent gets 0.
 * In knockout, all matches are effectively neutral (no host bonus).
 */
export function hostBonus(team: Team, isKnockout: boolean): number {
  if (isKnockout) return 0;
  return team.is_host ? HOST_BONUS : 0;
}

/** Sample a regulation-time score (goals_a, goals_b) for a match between teams a and b. */
export function sampleScore(
  a: Team,
  b: Team,
  rng: XoshiroRNG,
  isKnockout: boolean,
): { ga: number; gb: number } {
  const bonusA = hostBonus(a, isKnockout);
  const bonusB = hostBonus(b, isKnockout);
  const lambdaA = lambdaFor(a.elo, b.elo, bonusA);
  const lambdaB = lambdaFor(b.elo, a.elo, bonusB);
  return {
    ga: samplePoisson(lambdaA, rng),
    gb: samplePoisson(lambdaB, rng),
  };
}
