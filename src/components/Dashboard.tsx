'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSimulation } from '@/hooks/useSimulation';
import { Hero } from './Hero';
import { ChampionProbBar } from './ChampionProbBar';
import { StageMatrix } from './StageMatrix';
import { GroupCards } from './GroupCards';
import { BracketTree } from './BracketTree';
import { GoalStats } from './GoalStats';
import { SurpriseCards } from './SurpriseCards';

export function Dashboard() {
  const { state, run } = useSimulation();
  const lastStatus = useRef(state.status);

  useEffect(() => {
    // Confetti when sim completes successfully
    if (state.status === 'done' && lastStatus.current !== 'done') {
      fireConfetti();
      // Smooth scroll to results.
      setTimeout(() => {
        document.getElementById('champion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
    lastStatus.current = state.status;
  }, [state.status]);

  return (
    <div className="relative">
      <Hero state={state} onRun={run} />

      {state.result && (
        <>
          <ChampionProbBar result={state.result} />
          <StageMatrix result={state.result} />
          <GroupCards result={state.result} />
          <BracketTree result={state.result} />
          <GoalStats result={state.result} />
          <SurpriseCards result={state.result} />
        </>
      )}
    </div>
  );
}

function fireConfetti() {
  const colors = [
    'oklch(0.80 0.18 75)',
    'oklch(0.90 0.16 80)',
    'oklch(0.72 0.17 155)',
    'oklch(0.65 0.20 295)',
    'oklch(0.97 0.005 260)',
  ];
  const duration = 2000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
      gravity: 0.9,
      scalar: 1.1,
      drift: 0.5,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
      gravity: 0.9,
      scalar: 1.1,
      drift: -0.5,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
