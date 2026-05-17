'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SerializedResult, WorkerOutbound } from '@/lib/sim/worker';

export type SimStatus = 'idle' | 'running' | 'done' | 'error';

export interface SimState {
  status: SimStatus;
  completed: number;
  total: number;
  result: SerializedResult | null;
  durationMs: number | null;
  error: string | null;
}

const INITIAL: SimState = {
  status: 'idle',
  completed: 0,
  total: 0,
  result: null,
  durationMs: null,
  error: null,
};

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<SimState>(INITIAL);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((numSimulations: number, seed?: number) => {
    // Re-create worker each run to avoid state bleed.
    workerRef.current?.terminate();
    const worker = new Worker(new URL('@/lib/sim/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    setState({
      status: 'running',
      completed: 0,
      total: numSimulations,
      result: null,
      durationMs: null,
      error: null,
    });

    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setState((s) => ({ ...s, completed: msg.completed, total: msg.total }));
      } else if (msg.type === 'done') {
        setState((s) => ({
          ...s,
          status: 'done',
          completed: msg.result.numSimulations,
          total: msg.result.numSimulations,
          result: msg.result,
          durationMs: msg.durationMs,
        }));
      } else if (msg.type === 'error') {
        setState((s) => ({ ...s, status: 'error', error: msg.message }));
      }
    };

    worker.postMessage({ type: 'run', numSimulations, seed });
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setState(INITIAL);
  }, []);

  return { state, run, reset };
}
