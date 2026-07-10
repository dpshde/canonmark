/**
 * Round orchestration — pure enough to unit-test, used by the UI.
 */
import type { PoolItem } from "./daily";
import {
  selectPoolItemForPuzzle,
  selectEndlessItem,
  todayPuzzleNumber,
} from "./daily";
import { scoreRound, type HintStep, type ScoreResult } from "./scoring";
import { formatChapterLabel, quadrantForChapter } from "./books";
import { buildShareString } from "./share";
import {
  getDailyForPuzzle,
  recordDailyResult,
  localDateKey,
  loadState,
  type AppState,
} from "./storage";

export type GameMode = "daily" | "endless";

export interface RoundData {
  mode: GameMode;
  puzzleNumber: number | null;
  poolItem: PoolItem;
  verseText: string;
  paragraph: { start: number; end: number; verses: { v: number; t: string }[] } | null;
  hintStep: HintStep;
  phase: "playing" | "revealed";
  guessChapterIndex: number | null;
  result: ScoreResult | null;
}

export interface TextBundle {
  verses: Record<string, string>;
  paragraphs: Record<
    string,
    { start: number; end: number; verses: { v: number; t: string }[] }
  >;
}

export function startDailyRound(
  pool: PoolItem[],
  texts: TextBundle,
  now: Date = new Date()
): RoundData {
  const n = todayPuzzleNumber(now);
  const existing = getDailyForPuzzle(n);
  const item = selectPoolItemForPuzzle(n, pool);
  const verseKey = item.ref;
  const verseText = texts.verses[verseKey] ?? "(text unavailable)";
  const paragraph = texts.paragraphs[verseKey] ?? null;

  if (existing) {
    return {
      mode: "daily",
      puzzleNumber: n,
      poolItem: item,
      verseText,
      paragraph,
      hintStep: existing.hintStep as HintStep,
      phase: "revealed",
      guessChapterIndex: existing.guessChapterIndex,
      result: {
        distance: existing.distance,
        distancePts: Math.round(existing.total / (existing.hintStep === 1 ? 3 : existing.hintStep === 2 ? 2 : 1)),
        hintStep: existing.hintStep as HintStep,
        multiplier: existing.hintStep === 1 ? 3 : existing.hintStep === 2 ? 2 : 1,
        total: existing.total,
      },
    };
  }

  return {
    mode: "daily",
    puzzleNumber: n,
    poolItem: item,
    verseText,
    paragraph,
    hintStep: 1,
    phase: "playing",
    guessChapterIndex: null,
    result: null,
  };
}

export function startEndlessRound(
  pool: PoolItem[],
  texts: TextBundle
): RoundData {
  const item = selectEndlessItem(pool);
  const verseKey = item.ref;
  return {
    mode: "endless",
    puzzleNumber: null,
    poolItem: item,
    verseText: texts.verses[verseKey] ?? "(text unavailable)",
    paragraph: texts.paragraphs[verseKey] ?? null,
    hintStep: 1,
    phase: "playing",
    guessChapterIndex: null,
    result: null,
  };
}

export function takeHint(round: RoundData): RoundData {
  if (round.phase !== "playing") return round;
  const next = Math.min(3, (round.hintStep + 1) as HintStep) as HintStep;
  return { ...round, hintStep: next };
}

export function confirmGuess(
  round: RoundData,
  guessChapterIndex: number,
  now: Date = new Date()
): { round: RoundData; appState: AppState | null } {
  if (round.phase !== "playing") {
    return { round, appState: null };
  }
  const result = scoreRound(
    guessChapterIndex,
    round.poolItem.chapterIndex,
    round.hintStep
  );
  const next: RoundData = {
    ...round,
    phase: "revealed",
    guessChapterIndex,
    result,
  };

  let appState: AppState | null = null;
  if (round.mode === "daily" && round.puzzleNumber != null) {
    appState = recordDailyResult(
      {
        puzzleNumber: round.puzzleNumber,
        dateKey: localDateKey(now),
        guessChapterIndex,
        trueChapterIndex: round.poolItem.chapterIndex,
        trueRef: round.poolItem.ref,
        distance: result.distance,
        total: result.total,
        hintStep: result.hintStep,
        completedAt: now.toISOString(),
      },
      now
    );
  }

  return { round: next, appState };
}

export function shareForRound(round: RoundData): string | null {
  if (
    round.phase !== "revealed" ||
    !round.result ||
    round.guessChapterIndex == null ||
    round.puzzleNumber == null
  ) {
    return null;
  }
  return buildShareString({
    puzzleNumber: round.puzzleNumber,
    guessChapterIndex: round.guessChapterIndex,
    trueChapterIndex: round.poolItem.chapterIndex,
    distance: round.result.distance,
    total: round.result.total,
    hintStep: round.result.hintStep,
  });
}

export function formatTrueLocation(round: RoundData): string {
  return formatChapterLabel(round.poolItem.chapterIndex);
}

export function formatRef(item: PoolItem): string {
  const end =
    item.rangeEnd > item.verse ? `–${item.rangeEnd}` : "";
  return `${formatChapterLabel(item.chapterIndex)}:${item.verse}${end}`;
}

export function hintQuadrantLabel(round: RoundData): string {
  return quadrantForChapter(round.poolItem.chapterIndex).label;
}

export function currentAppState(): AppState {
  return loadState();
}
