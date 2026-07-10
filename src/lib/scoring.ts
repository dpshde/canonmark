/**
 * Distance score × hint multiplier (ADR: score-with-distance-and-hint-multiplier).
 *
 * points = round(1000 * 0.5^(d / 40))
 * d = |guessChapterIndex - trueChapterIndex|
 */

export type HintStep = 1 | 2 | 3;

/** Half-life of 40 chapters on the 1,189-axis. */
export const SCORE_HALF_LIFE = 40;
export const MAX_DISTANCE_POINTS = 1000;

export function chapterDistance(
  guessChapterIndex: number,
  trueChapterIndex: number
): number {
  return Math.abs(guessChapterIndex - trueChapterIndex);
}

/** Distance-only points in 0..1000. */
export function distancePoints(d: number): number {
  if (d <= 0) return MAX_DISTANCE_POINTS;
  const raw = MAX_DISTANCE_POINTS * Math.pow(0.5, d / SCORE_HALF_LIFE);
  return Math.round(raw);
}

export function hintMultiplier(step: HintStep): number {
  if (step <= 1) return 3;
  if (step === 2) return 2;
  return 1;
}

export interface ScoreResult {
  distance: number;
  distancePts: number;
  hintStep: HintStep;
  multiplier: number;
  total: number;
}

export function scoreRound(
  guessChapterIndex: number,
  trueChapterIndex: number,
  hintStep: HintStep
): ScoreResult {
  const distance = chapterDistance(guessChapterIndex, trueChapterIndex);
  const distancePts = distancePoints(distance);
  const multiplier = hintMultiplier(hintStep);
  return {
    distance,
    distancePts,
    hintStep,
    multiplier,
    total: distancePts * multiplier,
  };
}
