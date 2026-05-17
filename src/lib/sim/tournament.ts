import type { Team, TournamentResult, Stage } from './types';
import { simulateGroup, compareStandings, type TeamStanding } from './group';
import { simulateKnockout } from './knockout';
import type { XoshiroRNG } from './rng';

import groupsData from '@/data/groups.json';
import bracketData from '@/data/bracket.json';

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
type GroupLetter = (typeof GROUP_LETTERS)[number];

interface BracketSlot {
  /** "A1", "B2", etc. | { third_from: [...] } | "W73" (winner of match) | "L101" (loser of SF for 3rd place) */
  home: string | { third_from: string[] };
  away: string | { third_from: string[] };
  id: number;
}

const BRACKET = bracketData as unknown as {
  r32: BracketSlot[];
  r16: BracketSlot[];
  qf: BracketSlot[];
  sf: BracketSlot[];
  third_place: BracketSlot;
  final: BracketSlot;
};

/**
 * Simulate one complete World Cup tournament.
 *
 * Steps:
 *  1) Group stage: 12 groups × 6 matches = 72 matches.
 *  2) Rank teams within each group; rank the 12 third-placed teams; take top 8.
 *  3) Assign the 8 advancing 3rd-placed teams to the 8 "best 3rd" slots in R32 (simplified rule).
 *  4) Play R32 → R16 → QF → SF → 3rd-place + Final.
 */
export function simulateTournament(
  teams: Team[],
  teamIdx: Map<string, number>,
  rng: XoshiroRNG,
): TournamentResult {
  const N = teams.length;
  const stageReached: Stage[] = new Array(N).fill('group');
  const goalsFor = new Int32Array(N);
  const goalsAgainst = new Int32Array(N);

  // === 1) Group stage ===
  const groupStandings: Record<GroupLetter, TeamStanding[]> = {} as Record<GroupLetter, TeamStanding[]>;
  for (const letter of GROUP_LETTERS) {
    const ids = (groupsData.groups as Record<string, string[]>)[letter];
    const idxs = ids.map((id) => {
      const i = teamIdx.get(id);
      if (i === undefined) throw new Error(`Unknown team id in group ${letter}: ${id}`);
      return i;
    });
    const standings = simulateGroup(idxs, teams, rng, (h, a, gh, ga) => {
      goalsFor[h] += gh; goalsAgainst[h] += ga;
      goalsFor[a] += ga; goalsAgainst[a] += gh;
    });
    groupStandings[letter] = standings;
    // Mark stage reached for group teams (the ones who don't advance stay at 'group')
    // We'll bump advancing teams later.
  }

  // === 2) Rank the 12 third-placed teams; top 8 advance ===
  interface ThirdPlaceEntry { letter: GroupLetter; standing: TeamStanding; }
  const thirds: ThirdPlaceEntry[] = GROUP_LETTERS.map((letter) => ({
    letter,
    standing: groupStandings[letter][2],
  }));
  thirds.sort((x, y) => compareStandings(x.standing, y.standing));
  const advancingThirds = thirds.slice(0, 8);
  const eliminatedThirds = thirds.slice(8);

  // Mark group-finish stage
  for (const letter of GROUP_LETTERS) {
    const s = groupStandings[letter];
    stageReached[s[0].teamIdx] = 'r32';
    stageReached[s[1].teamIdx] = 'r32';
    // s[2] depends on advancing
    stageReached[s[3].teamIdx] = 'group';
  }
  for (const t of advancingThirds) stageReached[t.standing.teamIdx] = 'r32';
  for (const t of eliminatedThirds) stageReached[t.standing.teamIdx] = 'group';

  // === 3) Assign 8 advancing 3rd-placed teams to bracket "third_from" slots ===
  // Simplification: for each R32 slot demanding a "best 3rd from groups X,Y,...":
  //   pick the highest-ranked advancing 3rd whose group letter is in the allowed set
  //   and hasn't been assigned yet. If no candidate fits (rare edge case), fall back
  //   to the highest-ranked unassigned advancing 3rd.
  const sortedAdvancingThirds = [...advancingThirds]; // already sorted best→worst
  const assignedThirds = new Set<GroupLetter>();
  const slotToThirdIdx: Map<number, number> = new Map(); // match id → team idx

  for (const match of BRACKET.r32) {
    for (const side of ['home', 'away'] as const) {
      const slot = match[side];
      if (typeof slot === 'object' && 'third_from' in slot) {
        const allowed = new Set(slot.third_from);
        const pick = sortedAdvancingThirds.find(
          (t) => allowed.has(t.letter) && !assignedThirds.has(t.letter),
        ) ?? sortedAdvancingThirds.find((t) => !assignedThirds.has(t.letter));
        if (pick) {
          assignedThirds.add(pick.letter);
          slotToThirdIdx.set(match.id * 2 + (side === 'home' ? 0 : 1), pick.standing.teamIdx);
        }
      }
    }
  }

  // Helper to resolve a slot reference to a team index.
  const matchWinner: Map<number, number> = new Map();
  const matchLoser: Map<number, number> = new Map();

  const resolveSlot = (slot: string | { third_from: string[] }, matchId: number, side: 'home' | 'away'): number => {
    if (typeof slot === 'object') {
      const idx = slotToThirdIdx.get(matchId * 2 + (side === 'home' ? 0 : 1));
      if (idx === undefined) throw new Error(`Unassigned third-slot for match ${matchId} ${side}`);
      return idx;
    }
    // Group reference like "A1", "B2", "L1"
    if (/^[A-L][12]$/.test(slot)) {
      const letter = slot[0] as GroupLetter;
      const pos = parseInt(slot[1], 10) - 1;
      return groupStandings[letter][pos].teamIdx;
    }
    // Winner reference like "W73"
    if (slot.startsWith('W')) {
      const id = parseInt(slot.slice(1), 10);
      const idx = matchWinner.get(id);
      if (idx === undefined) throw new Error(`Match ${id} winner not yet computed (slot=${slot})`);
      return idx;
    }
    // Loser reference like "L101" (used for 3rd-place playoff)
    if (slot.startsWith('L')) {
      const id = parseInt(slot.slice(1), 10);
      const idx = matchLoser.get(id);
      if (idx === undefined) throw new Error(`Match ${id} loser not yet computed (slot=${slot})`);
      return idx;
    }
    throw new Error(`Unknown slot reference: ${slot}`);
  };

  // === 4) Run knockout rounds ===
  const runRound = (matches: BracketSlot[], reachedStage: Stage, nextStage: Stage) => {
    for (const m of matches) {
      const homeIdx = resolveSlot(m.home, m.id, 'home');
      const awayIdx = resolveSlot(m.away, m.id, 'away');
      const r = simulateKnockout(homeIdx, awayIdx, teams, rng);
      matchWinner.set(m.id, r.winnerIdx);
      matchLoser.set(m.id, r.loserIdx);
      // Goals from regulation count toward stats (penalties excluded since drawn games have gh==ga).
      goalsFor[homeIdx] += r.gh; goalsAgainst[homeIdx] += r.ga;
      goalsFor[awayIdx] += r.ga; goalsAgainst[awayIdx] += r.gh;
      // Both teams reached `reachedStage`. Winner gets bumped to nextStage.
      stageReached[homeIdx] = furthestStage(stageReached[homeIdx], reachedStage);
      stageReached[awayIdx] = furthestStage(stageReached[awayIdx], reachedStage);
      stageReached[r.winnerIdx] = furthestStage(stageReached[r.winnerIdx], nextStage);
    }
  };

  runRound(BRACKET.r32, 'r32', 'r16');
  runRound(BRACKET.r16, 'r16', 'qf');
  runRound(BRACKET.qf, 'qf', 'sf');
  runRound(BRACKET.sf, 'sf', 'final');

  // 3rd place playoff (losers of SF). Both teams stay at stageReached='sf' —
  // winning bronze doesn't bump the stage. Bronze is tracked via thirdPlace below.
  {
    const m = BRACKET.third_place;
    const homeIdx = resolveSlot(m.home, m.id, 'home');
    const awayIdx = resolveSlot(m.away, m.id, 'away');
    const r = simulateKnockout(homeIdx, awayIdx, teams, rng);
    matchWinner.set(m.id, r.winnerIdx);
    matchLoser.set(m.id, r.loserIdx);
    goalsFor[homeIdx] += r.gh; goalsAgainst[homeIdx] += r.ga;
    goalsFor[awayIdx] += r.ga; goalsAgainst[awayIdx] += r.gh;
  }
  const thirdPlace = matchWinner.get(BRACKET.third_place.id)!;
  const fourthPlace = matchLoser.get(BRACKET.third_place.id)!;

  // Final
  {
    const m = BRACKET.final;
    const homeIdx = resolveSlot(m.home, m.id, 'home');
    const awayIdx = resolveSlot(m.away, m.id, 'away');
    const r = simulateKnockout(homeIdx, awayIdx, teams, rng);
    matchWinner.set(m.id, r.winnerIdx);
    matchLoser.set(m.id, r.loserIdx);
    goalsFor[homeIdx] += r.gh; goalsAgainst[homeIdx] += r.ga;
    goalsFor[awayIdx] += r.ga; goalsAgainst[awayIdx] += r.gh;
    stageReached[r.winnerIdx] = 'champion';
  }
  const champion = matchWinner.get(BRACKET.final.id)!;
  const runnerUp = matchLoser.get(BRACKET.final.id)!;

  return { champion, runnerUp, thirdPlace, fourthPlace, stageReached, goalsFor, goalsAgainst };
}

const STAGE_ORDER: Stage[] = ['group', 'r32', 'r16', 'qf', 'sf', 'final', 'champion'];
function furthestStage(a: Stage, b: Stage): Stage {
  return STAGE_ORDER.indexOf(a) > STAGE_ORDER.indexOf(b) ? a : b;
}
