/**
 * Mobile game wiring against real @versemark/core APIs + bundled pool/texts.
 * No mocked score/daily/share — asserts concrete domain results.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  startDailyRound,
  startEndlessRound,
  takeHint,
  canTakeHint,
  confirmGuess,
  shareForRound,
  advanceDailyRound,
  scoreRound,
  selectPoolItemsForPuzzle,
  puzzleNumberFromDateString,
  setStorageBackend,
  createMemoryKvStore,
  loadState,
  listAchievements,
  todayPuzzleNumber,
} from "@versemark/core";
import { loadPool, loadTextBundles, loadTexts } from "../src/lib/gameData";
import { placeFromFraction } from "../src/lib/placement";

const pool = loadPool();
const texts = loadTexts();

beforeEach(() => {
  setStorageBackend(createMemoryKvStore());
});

describe("mobile gameData + core wiring", () => {
  it("loads real pool and BSB texts for pool items", () => {
    expect(pool.length).toBeGreaterThan(100);
    const sample = pool[0]!;
    expect(texts.verses[sample.ref]).toBeTruthy();
    expect(typeof texts.verses[sample.ref]).toBe("string");
  });

  it("bundles both web translations for offline native switching", () => {
    const bundles = loadTextBundles();
    const sample = pool.find((item) => bundles.bsb.verses[item.ref] && bundles.kjv.verses[item.ref]);
    expect(sample).toBeTruthy();
    expect(bundles.bsb.verses[sample!.ref]).not.toBe(bundles.kjv.verses[sample!.ref]);
    expect(bundles.kjv.paragraphs[sample!.ref]).toBeTruthy();
  });

  it("daily: fixed date → stable items → score matches scoreRound ADR", () => {
    const fixed = new Date(2026, 7, 15); // Aug 15 2026 local
    const n = puzzleNumberFromDateString("2026-08-15");
    expect(n).toBe(15);
    const items = selectPoolItemsForPuzzle(n, pool);
    expect(items).toHaveLength(3);

    let round = startDailyRound(pool, texts, fixed);
    expect(round.mode).toBe("daily");
    expect(round.puzzleNumber).toBe(15);
    expect(round.phase).toBe("playing");
    expect(round.verseText.length).toBeGreaterThan(10);
    expect(round.poolItem.ref).toBe(items[0]!.ref);

    // Placement from timeline mid-rail
    const guess = placeFromFraction(0.42).verseIndex;
    const { round: done, appState } = confirmGuess(round, guess, fixed);
    expect(done.phase).toBe("revealed");
    expect(done.result).not.toBeNull();
    const expected = scoreRound(guess, items[0]!.verseIndex, 1);
    expect(done.result!.total).toBe(expected.total);
    expect(done.result!.distance).toBe(expected.distance);
    expect(appState).not.toBeNull();
    expect(loadState().lifetime.scoredRounds).toBeGreaterThanOrEqual(1);
  });

  it("daily full run produces share string from core", () => {
    const fixed = new Date(2026, 7, 1);
    let round = startDailyRound(pool, texts, fixed);
    for (let i = 0; i < 3; i++) {
      if (round.phase === "revealed") {
        round = advanceDailyRound(round, texts);
      }
      const guess = round.poolItem.verseIndex;
      round = confirmGuess(round, guess, fixed).round;
    }
    const share = shareForRound(round);
    expect(share).not.toBeNull();
    expect(share!).toContain("Versemark 1 Aug 2026");
    expect(share!).toContain("pts");
    expect(share!).toContain("https://versemark.app");
  });

  it("endless + hints use core canTakeHint / takeHint", () => {
    let round = startEndlessRound(pool, texts);
    expect(round.mode).toBe("endless");
    expect(round.hintStep).toBe(1);
    if (canTakeHint(round)) {
      round = takeHint(round);
      expect(round.hintStep).toBe(2);
    }
    const { round: done } = confirmGuess(
      round,
      round.poolItem.verseIndex,
      new Date()
    );
    expect(done.result!.distance).toBe(0);
    expect(done.result!.total).toBe(
      scoreRound(done.poolItem.verseIndex, done.poolItem.verseIndex, done.hintStep)
        .total
    );
  });

  it("achievements list is driven by core state after play", () => {
    const fixed = new Date(2026, 7, 20);
    let round = startEndlessRound(pool, texts);
    // Exact no-hint to unlock early placement achievements when possible
    confirmGuess(round, round.poolItem.verseIndex, fixed);
    const state = loadState();
    const list = listAchievements(state);
    expect(list.length).toBeGreaterThan(5);
    expect(list.some((a) => a.id.length > 0)).toBe(true);
  });

  it("today puzzle number is finite for current date", () => {
    expect(Number.isFinite(todayPuzzleNumber())).toBe(true);
  });
});
