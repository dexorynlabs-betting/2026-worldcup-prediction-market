/**
 * Quick smoke test for the simulation engine.
 * Runs N simulations and prints top-10 champion probabilities + avg tournament goals.
 *
 * Usage: npx tsx scripts/test-sim.ts [num_sims]
 */

import { runSimulations, championProbabilities } from '../src/lib/sim/engine';

const N = parseInt(process.argv[2] ?? '10000', 10);

console.log(`Running ${N.toLocaleString()} simulations…`);
const t0 = Date.now();
let lastPct = 0;
const agg = runSimulations({
  numSimulations: N,
  seed: 42,
  onProgress: (done, total) => {
    const pct = Math.floor((done / total) * 100);
    if (pct >= lastPct + 10) {
      process.stdout.write(`  ${pct}%… `);
      lastPct = pct;
    }
  },
});
const ms = Date.now() - t0;
console.log(`\nDone in ${(ms / 1000).toFixed(2)}s (${((N / ms) * 1000).toFixed(0)} sims/sec).\n`);

const probs = championProbabilities(agg);
console.log('Top 10 champion probabilities:');
for (let i = 0; i < 10; i++) {
  const p = probs[i];
  const pct = (p.pct * 100).toFixed(2).padStart(5);
  console.log(`  ${(i + 1).toString().padStart(2)}. ${p.team.name_en.padEnd(22)} ${pct}%  (ELO ${p.team.elo})`);
}

const sumChamp = probs.reduce((s, p) => s + p.pct, 0);
console.log(`\nSum of champion probabilities: ${(sumChamp * 100).toFixed(3)}%  (should be 100.000%)`);

// Avg goals per tournament
let totalGoals = 0;
for (let g = 0; g < agg.tournamentGoalsHistogram.length; g++) {
  totalGoals += g * agg.tournamentGoalsHistogram[g];
}
const avgTournamentGoals = totalGoals / N;
const avgGoalsPerMatch = avgTournamentGoals / 104;
console.log(`Avg goals per tournament: ${avgTournamentGoals.toFixed(1)}  (≈ ${avgGoalsPerMatch.toFixed(2)} per match)`);
