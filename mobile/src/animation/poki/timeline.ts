import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The one place that owns intro timing. The 3D scene reads `clock.elapsed()`
 * every frame, and React UI reacts to `phase`, so both always agree.
 *
 * dragging → centered → exploding → revealing → idle
 */
export const INTRO = {
  /** Mascot drags the gift in from the left. */
  dragEnd: 1.85,
  /** Exhausted beat, then the box gathers itself. */
  anticipate: 2.15,
  /** The gift bursts open. */
  burst: 2.45,
  /** Gift moves up while the form springs in. */
  revealStart: 2.8,
  revealEnd: 3.55,
} as const;

export type IntroPhase = 'dragging' | 'centered' | 'exploding' | 'revealing' | 'idle';

export function phaseAt(t: number): IntroPhase {
  if (t < INTRO.dragEnd) return 'dragging';
  if (t < INTRO.burst) return 'centered';
  if (t < INTRO.revealStart) return 'exploding';
  if (t < INTRO.revealEnd) return 'revealing';
  return 'idle';
}

export const isFormRevealed = (phase: IntroPhase) => phase === 'revealing' || phase === 'idle';

/** Seconds since the intro started; can be jumped forward when skipping. */
export class IntroClock {
  private origin = Date.now();
  private offset = 0;

  elapsed() {
    return (Date.now() - this.origin) / 1000 + this.offset;
  }

  /** Starts over from 0, such as once the 3D canvas is finally up. */
  restart() {
    this.origin = Date.now();
    this.offset = 0;
  }

  jumpTo(t: number) {
    const now = this.elapsed();
    if (t > now) this.offset += t - now;
  }
}

/**
 * Drives the intro phases. `instant` (reduced motion, screen reader) starts
 * straight in the settled layout.
 */
export function useIntroSequence(instant: boolean) {
  const [clock] = useState(() => new IntroClock());
  const [phase, setPhase] = useState<IntroPhase>('dragging');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const schedule = useCallback(() => {
    clearTimers();
    const now = clock.elapsed();
    const sync = () => setPhase(phaseAt(clock.elapsed() + 0.001));
    timers.current.push(setTimeout(sync, 0));
    for (const at of [INTRO.dragEnd, INTRO.burst, INTRO.revealStart, INTRO.revealEnd]) {
      if (at > now) timers.current.push(setTimeout(sync, (at - now) * 1000));
    }
  }, [clock]);

  /**
   * Skipping jumps to the reveal so the form springs in right away; `toEnd`
   * lands directly on the settled layout.
   */
  const skip = useCallback(
    (toEnd = false) => {
      clock.jumpTo(toEnd ? INTRO.revealEnd : INTRO.revealStart);
      schedule();
    },
    [clock, schedule],
  );

  /** Replays from the start, unless it already reached the end. */
  const restart = useCallback(() => {
    if (clock.elapsed() >= INTRO.revealEnd) return;
    clock.restart();
    schedule();
  }, [clock, schedule]);

  useEffect(() => {
    if (instant) clock.jumpTo(INTRO.revealEnd);
    schedule();
    return clearTimers;
  }, [clock, instant, schedule]);

  return { clock, phase, skip, restart };
}
