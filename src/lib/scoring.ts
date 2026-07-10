/**
 * Distance score × hint multiplier (ADR: score-with-distance-and-hint-multiplier).
 *
 * base    = round(1000 * 0.5^(d / halfLife))
 * bonus   = exact (d=0) or close (d≤5) proximity bonus
 * points  = (base + bonus) × hintMultiplier
 *
 * d = |guessVerseIndex - trueVerseIndex| on the 31,102-verse axis.
 * Half-life is 1000 verses (~38 average chapters).
 */

export type HintStep = 1 | 2 | 3;

/** Half-life of ~1000 verses on the 31,102-verse axis. */
export const SCORE_HALF_LIFE = 1000;
export const MAX_DISTANCE_POINTS = 1000;

/** Extra points for a perfect verse hit (before hint multiplier). */
export const EXACT_BONUS = 500;
/** Extra points when within a few verses (before hint multiplier). */
export const CLOSE_BONUS = 350;
/** Inclusive verse distance that still earns the close bonus. */
export const CLOSE_DISTANCE = 5;

export function verseDistance(
  guessVerseIndex: number,
  trueVerseIndex: number
): number {
  return Math.abs(guessVerseIndex - trueVerseIndex);
}

/** @deprecated Use verseDistance. */
export function chapterDistance(
  guess: number,
  truth: number
): number {
  return verseDistance(guess, truth);
}

/** Distance-only points in 0..1000 (no proximity bonus). */
export function distancePoints(d: number): number {
  if (d <= 0) return MAX_DISTANCE_POINTS;
  const raw = MAX_DISTANCE_POINTS * Math.pow(0.5, d / SCORE_HALF_LIFE);
  return Math.round(raw);
}

/**
 * Substantial proximity bonuses on top of the smooth falloff curve.
 * Exact hits outrank near-misses; beyond CLOSE_DISTANCE there is no bonus.
 */
export function proximityBonus(d: number): number {
  if (d <= 0) return EXACT_BONUS;
  if (d <= CLOSE_DISTANCE) return CLOSE_BONUS;
  return 0;
}

export function hintMultiplier(step: HintStep): number {
  if (step <= 1) return 3;
  if (step === 2) return 2;
  return 1;
}

export interface ScoreResult {
  distance: number;
  distancePts: number;
  proximityBonus: number;
  hintStep: HintStep;
  multiplier: number;
  total: number;
}

export function scoreRound(
  guessVerseIndex: number,
  trueVerseIndex: number,
  hintStep: HintStep
): ScoreResult {
  const distance = verseDistance(guessVerseIndex, trueVerseIndex);
  const distancePts = distancePoints(distance);
  const bonus = proximityBonus(distance);
  const multiplier = hintMultiplier(hintStep);
  return {
    distance,
    distancePts,
    proximityBonus: bonus,
    hintStep,
    multiplier,
    total: (distancePts + bonus) * multiplier,
  };
}
