/// <reference lib="webworker" />

import { runSimulations } from './engine';
import type { AggregateResult } from './types';

export type WorkerInbound =
  | { type: 'run'; numSimulations: number; seed?: number };

export type WorkerOutbound =
  | { type: 'progress'; completed: number; total: number }
  | { type: 'done'; result: SerializedResult; durationMs: number }
  | { type: 'error'; message: string };

/**
 * AggregateResult includes typed arrays (Int32Array, Float64Array). They
 * survive postMessage via the structured-clone algorithm, but we can also
 * mark them transferable to avoid a copy of large buffers.
 *
 * For readability on the receiving side, we serialize counts as plain arrays
 * — the data is small (48 teams × a handful of fields) and the legibility
 * win is bigger than the perf cost.
 */
export interface SerializedResult {
  numSimulations: number;
  teams: AggregateResult['teams'];
  stageCounts: {
    r32: number[];
    r16: number[];
    qf: number[];
    sf: number[];
    final: number[];
    third: number[];
    champion: number[];
  };
  totalGoalsFor: number[];
  totalGoalsAgainst: number[];
  groupFinish: {
    first: number[];
    second: number[];
    thirdAdvances: number[];
    thirdOut: number[];
    fourth: number[];
  };
  tournamentGoalsHistogram: number[];
}

function serialize(agg: AggregateResult): SerializedResult {
  const ta = (arr: Int32Array | Float64Array) => Array.from(arr);
  return {
    numSimulations: agg.numSimulations,
    teams: agg.teams,
    stageCounts: {
      r32:      ta(agg.stageCounts.r32),
      r16:      ta(agg.stageCounts.r16),
      qf:       ta(agg.stageCounts.qf),
      sf:       ta(agg.stageCounts.sf),
      final:    ta(agg.stageCounts.final),
      third:    ta(agg.stageCounts.third),
      champion: ta(agg.stageCounts.champion),
    },
    totalGoalsFor: ta(agg.totalGoalsFor),
    totalGoalsAgainst: ta(agg.totalGoalsAgainst),
    groupFinish: {
      first:         ta(agg.groupFinish.first),
      second:        ta(agg.groupFinish.second),
      thirdAdvances: ta(agg.groupFinish.thirdAdvances),
      thirdOut:      ta(agg.groupFinish.thirdOut),
      fourth:        ta(agg.groupFinish.fourth),
    },
    tournamentGoalsHistogram: ta(agg.tournamentGoalsHistogram),
  };
}

self.onmessage = (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;
  if (msg.type === 'run') {
    try {
      const t0 = performance.now();
      const result = runSimulations({
        numSimulations: msg.numSimulations,
        seed: msg.seed,
        onProgress: (completed, total) => {
          (self as unknown as Worker).postMessage({ type: 'progress', completed, total } satisfies WorkerOutbound);
        },
      });
      const durationMs = performance.now() - t0;
      (self as unknown as Worker).postMessage({
        type: 'done',
        result: serialize(result),
        durationMs,
      } satisfies WorkerOutbound);
    } catch (err) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      } satisfies WorkerOutbound);
    }
  }
};
