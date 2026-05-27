'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { SerializedResult, WorkerOutbound } from '@/lib/sim/worker';

export type SimStatus = 'idle' | 'running' | 'done' | 'error';

export interface SimState {
  status: SimStatus;
  completed: number;
  total: number;
  /** Primary result (with absences applied — the model's headline view). */
  result: SerializedResult | null;
  /** Counterfactual: same seed, same N, but with absences disabled. */
  resultNoAbsences: SerializedResult | null;
  /** Which pass is currently running (for progress messaging). */
  scenario: 'withAbsences' | 'noAbsences' | null;
  durationMs: number | null;
  error: string | null;
}

const INITIAL: SimState = {
  status: 'idle',
  completed: 0,
  total: 0,
  result: null,
  resultNoAbsences: null,
  scenario: null,
  durationMs: null,
  error: null,
};

/** Survives locale navigation so results stay visible after ES ↔ EN switch. */
let sharedState: SimState = INITIAL;
let sharedWorker: Worker | null = null;

function commitState(setState: Dispatch<SetStateAction<SimState>>, next: SimState) {
  sharedState = next;
  setState(next);
}

function patchState(setState: Dispatch<SetStateAction<SimState>>, patch: Partial<SimState>) {
  setState((prev) => {
    const next = { ...prev, ...patch };
    sharedState = next;
    return next;
  });
}

function attachWorkerHandlers(
  worker: Worker,
  setState: Dispatch<SetStateAction<SimState>>,
) {
  worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      patchState(setState, {
        completed: msg.completed,
        total: msg.total,
        scenario: msg.scenario,
      });
    } else if (msg.type === 'done') {
      patchState(setState, {
        status: 'done',
        completed: msg.result.numSimulations,
        total: msg.result.numSimulations,
        result: msg.result,
        resultNoAbsences: msg.resultNoAbsences,
        scenario: null,
        durationMs: msg.durationMs,
      });
    } else if (msg.type === 'error') {
      patchState(setState, { status: 'error', error: msg.message });
    }
  };
}

export function useSimulation() {
  const workerRef = useRef<Worker | null>(sharedWorker);
  const [state, setState] = useState<SimState>(() => sharedState);

  useEffect(() => {
    if (sharedWorker && sharedState.status === 'running') {
      workerRef.current = sharedWorker;
      attachWorkerHandlers(sharedWorker, setState);
    }
  }, []);

  const run = useCallback((numSimulations: number, seed?: number) => {
    sharedWorker?.terminate();
    const worker = new Worker(new URL('@/lib/sim/worker.ts', import.meta.url), { type: 'module' });
    sharedWorker = worker;
    workerRef.current = worker;

    commitState(setState, {
      status: 'running',
      completed: 0,
      total: numSimulations,
      result: null,
      resultNoAbsences: null,
      scenario: 'withAbsences',
      durationMs: null,
      error: null,
    });

    attachWorkerHandlers(worker, setState);
    worker.postMessage({ type: 'run', numSimulations, seed });
  }, []);

  const reset = useCallback(() => {
    sharedWorker?.terminate();
    sharedWorker = null;
    workerRef.current = null;
    commitState(setState, INITIAL);
  }, []);

  return { state, run, reset };
}
