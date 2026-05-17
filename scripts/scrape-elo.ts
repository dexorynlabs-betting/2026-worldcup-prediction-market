/**
 * Fetches current ELO ratings from eloratings.net and updates src/data/teams.json.
 *
 * eloratings.net publishes a TSV at https://www.eloratings.net/World.tsv with all
 * national teams. The columns we care about: ISO3 code (col 1) and current rating (col 3).
 *
 * Usage: npm run scrape-elo
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEAMS_PATH = resolve(process.cwd(), 'src/data/teams.json');
const SOURCE_URL = 'https://www.eloratings.net/World.tsv';

// Map our internal team IDs to eloratings.net codes (mostly matches, with overrides)
const ID_OVERRIDES: Record<string, string> = {
  ENG: 'ENG',
  SCO: 'SCO',
  KOR: 'KOR',
  USA: 'USA',
  IRN: 'IRN', // some sources use IRN, others IRA
  IRQ: 'IRQ',
  KSA: 'KSA',
  CIV: 'CIV',
  CPV: 'CPV',
  COD: 'COD',
  RSA: 'RSA',
  CUW: 'CUW',
  POR: 'POR',
  GER: 'GER',
  NED: 'NED',
  CRO: 'CRO',
  SUI: 'SUI',
  SEN: 'SEN',
  JPN: 'JPN',
  ARG: 'ARG',
  BRA: 'BRA',
  FRA: 'FRA',
  ESP: 'ESP',
  BEL: 'BEL',
  MAR: 'MAR',
  COL: 'COL',
  URU: 'URU',
  ECU: 'ECU',
  PAR: 'PAR',
  MEX: 'MEX',
  CAN: 'CAN',
  AUS: 'AUS',
  EGY: 'EGY',
  ALG: 'ALG',
  TUN: 'TUN',
  AUT: 'AUT',
  TUR: 'TUR',
  NOR: 'NOR',
  SWE: 'SWE',
  CZE: 'CZE',
  BIH: 'BIH',
  GHA: 'GHA',
  QAT: 'QAT',
  UZB: 'UZB',
  JOR: 'JOR',
  NZL: 'NZL',
  PAN: 'PAN',
  HAI: 'HAI',
};

interface Team {
  id: string;
  name_en: string;
  name_es: string;
  flag: string;
  elo: number;
  is_host: boolean;
}

interface TeamsFile {
  _meta: Record<string, unknown>;
  teams: Team[];
}

async function main() {
  console.log(`Fetching ${SOURCE_URL}…`);
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'mundial2026-sim/0.1 (scrape-elo)' },
  });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  }
  const tsv = await res.text();

  // Parse TSV: each line is `CODE\tNAME\tRATING\t…`
  const ratings = new Map<string, number>();
  for (const line of tsv.split('\n')) {
    const cols = line.split('\t');
    if (cols.length < 3) continue;
    const code = cols[0]?.trim().toUpperCase();
    const rating = parseFloat(cols[2]);
    if (code && Number.isFinite(rating)) {
      ratings.set(code, rating);
    }
  }
  console.log(`Parsed ${ratings.size} team ratings from source.`);

  const data: TeamsFile = JSON.parse(readFileSync(TEAMS_PATH, 'utf-8'));
  let updated = 0;
  const missing: string[] = [];

  for (const team of data.teams) {
    const code = ID_OVERRIDES[team.id] ?? team.id;
    const fresh = ratings.get(code);
    if (fresh === undefined) {
      missing.push(team.id);
      continue;
    }
    if (Math.abs(team.elo - fresh) > 0.5) {
      console.log(`  ${team.id}: ${team.elo} → ${fresh.toFixed(0)}`);
      team.elo = Math.round(fresh);
      updated++;
    }
  }

  if (missing.length > 0) {
    console.warn(`\nMissing from source (kept existing value): ${missing.join(', ')}`);
  }

  data._meta = {
    ...data._meta,
    source: `Scraped from ${SOURCE_URL}`,
    fetched_at: new Date().toISOString(),
  };

  writeFileSync(TEAMS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`\nUpdated ${updated} ratings. Wrote ${TEAMS_PATH}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
