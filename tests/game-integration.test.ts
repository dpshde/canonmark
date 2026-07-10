import { describe, it, expect, beforeEach } from "vitest";
import {
  startDailyRound,
  startEndlessRound,
  takeHint,
  canTakeHint,
  isUsefulParagraph,
  confirmGuess,
  shareForRound,
  advanceDailyRound,
  type TextBundle,
} from "../src/lib/game";
import type { PoolItem } from "../src/lib/daily";
import { selectPoolItemForPuzzle, selectPoolItemsForPuzzle, puzzleNumberFromDateString } from "../src/lib/daily";
import { scoreRound } from "../src/lib/scoring";
import poolData from "../src/data/pool.json";

// Minimal in-memory localStorage for node tests
const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: () => null,
      length: 0,
    },
  });
});

const pool = (poolData as { items: PoolItem[] }).items;

function textsFor(item: PoolItem, multiVersePara = false): TextBundle {
  const verses: Record<string, string> = {
    [item.ref]: `Sample text for ${item.ref}`,
  };
  const paraVerses = multiVersePara
    ? [
        { v: Math.max(1, item.verse - 1), t: `Context before ${item.ref}` },
        { v: item.verse, t: `Sample text for ${item.ref}` },
      ]
    : [{ v: item.verse, t: `Sample text for ${item.ref}` }];
  if (multiVersePara && item.verse > 1) {
    verses[`${item.osis}.${item.chapter}.${item.verse - 1}`] =
      `Context before ${item.ref}`;
  }
  return {
    verses,
    paragraphs: {
      [item.ref]: {
        start: paraVerses[0].v,
        end: paraVerses[paraVerses.length - 1].v,
        verses: paraVerses,
      },
    },
  };
}

describe("full round flow", () => {
  it("daily: verse → hint ladder → confirm → score with ADR formula", () => {
    const fixed = new Date(2026, 7, 15); // local Aug 15 2026 → puzzle #15
    const n = puzzleNumberFromDateString("2026-08-15");
    expect(n).toBe(15);
    const items = selectPoolItemsForPuzzle(n, pool);
    const texts: TextBundle = { verses: {}, paragraphs: {} };
    for (const selected of items) {
      // Multi-verse paragraphs so the full hint ladder (×3 → ×2 → ×1) applies.
      const bundle = textsFor(selected, true);
      Object.assign(texts.verses, bundle.verses);
      Object.assign(texts.paragraphs, bundle.paragraphs);
    }
    const item = items[0];
    let round = startDailyRound(pool, texts, fixed);
    expect(round.phase).toBe("playing");
    expect(round.verseText).toContain(item.ref);
    expect(round.hintStep).toBe(1);
    expect(isUsefulParagraph(round.paragraph, item.verse)).toBe(true);

    round = takeHint(round);
    expect(round.hintStep).toBe(2);
    expect(canTakeHint(round)).toBe(true);
    round = takeHint(round);
    expect(round.hintStep).toBe(3);
    expect(canTakeHint(round)).toBe(false);

    const guess = item.verseIndex + 1000; // half-life offset in verses
    const { round: done } = confirmGuess(round, guess, fixed);
    expect(done.phase).toBe("revealed");
    expect(done.result).not.toBeNull();
    const expected = scoreRound(guess, item.verseIndex, 3);
    expect(done.result!.total).toBe(expected.total);
    expect(done.result!.distance).toBe(1000);
    expect(done.result!.distancePts).toBe(500);

    let final = done;
    for (let index = 1; index < 4; index += 1) {
      final = advanceDailyRound(final, texts);
      final = confirmGuess(final, final.poolItem.verseIndex, fixed).round;
    }
    const share = shareForRound(final);
    expect(share).not.toBeNull();
    // "Versemark 15 Aug 2026 · {total} pts" then score line, then URL
    expect(share!).toContain("Versemark 15 Aug 2026 · ");
    expect(share!).toContain(" pts\n\n");
    const body = share!.split("\n\n")[1];
    expect(body.split(" \u00B7 ")).toHaveLength(4);
    expect(share).toContain("https://versemark.app");
  });

  it("singleton paragraph is not a useful first hint — testament half shows instead", () => {
    const fixed = new Date(2026, 7, 15);
    const items = selectPoolItemsForPuzzle(15, pool);
    const texts: TextBundle = { verses: {}, paragraphs: {} };
    for (const selected of items) {
      // Single-verse "paragraph" = same as the verse card
      const bundle = textsFor(selected, false);
      Object.assign(texts.verses, bundle.verses);
      Object.assign(texts.paragraphs, bundle.paragraphs);
    }
    let round = startDailyRound(pool, texts, fixed);
    expect(isUsefulParagraph(round.paragraph, round.poolItem.verse)).toBe(
      false
    );
    round = takeHint(round);
    expect(round.hintStep).toBe(2);
    // No second hint: quadrant already delivered at step 2
    expect(canTakeHint(round)).toBe(false);
    const again = takeHint(round);
    expect(again.hintStep).toBe(2);
  });

  it("endless produces a playable round from pool", () => {
    const allTexts: TextBundle = { verses: {}, paragraphs: {} };
    for (const p of pool.slice(0, 50)) {
      allTexts.verses[p.ref] = `T ${p.ref}`;
      allTexts.paragraphs[p.ref] = {
        start: p.verse,
        end: p.verse,
        verses: [{ v: p.verse, t: `T ${p.ref}` }],
      };
    }
    const round = startEndlessRound(pool, allTexts);
    expect(round.mode).toBe("endless");
    expect(round.phase).toBe("playing");
    expect(round.verseText.length).toBeGreaterThan(0);
  });

  it("consumer path: fixed date → stable pool ref; score triple matches ADR", () => {
    const date = "2026-08-01";
    const n = puzzleNumberFromDateString(date);
    const refA = selectPoolItemForPuzzle(n, pool).ref;
    const refB = selectPoolItemForPuzzle(n, pool).ref;
    expect(refA).toBe(refB);

    const scored = scoreRound(1000, 2000, 1); // d=1000 verses, ×3
    expect(scored.distancePts).toBe(500);
    expect(scored.total).toBe(1500);
  });

  it("daily: partial progress is cached and resumed after restart", () => {
    const fixed = new Date(2026, 7, 15);
    const n = puzzleNumberFromDateString("2026-08-15");
    const items = selectPoolItemsForPuzzle(n, pool);
    const texts: TextBundle = { verses: {}, paragraphs: {} };
    for (const selected of items) {
      const bundle = textsFor(selected);
      Object.assign(texts.verses, bundle.verses);
      Object.assign(texts.paragraphs, bundle.paragraphs);
    }

    let round = startDailyRound(pool, texts, fixed);
    const firstGuess = items[0].verseIndex + 50;
    const { round: afterOne, appState } = confirmGuess(round, firstGuess, fixed);
    expect(afterOne.phase).toBe("revealed");
    expect(afterOne.daily!.results).toHaveLength(1);
    expect(appState).not.toBeNull();
    expect(appState!.lastDaily!.completedAt).toBeNull();
    expect(appState!.lastDaily!.rounds).toHaveLength(1);
    // Incomplete day must not count toward streak
    expect(appState!.streak).toBe(0);

    // Simulate refresh: new start should restore last confirmed verse
    const resumed = startDailyRound(pool, texts, fixed);
    expect(resumed.phase).toBe("revealed");
    expect(resumed.daily!.index).toBe(0);
    expect(resumed.daily!.results).toHaveLength(1);
    expect(resumed.guessVerseIndex).toBe(firstGuess);
    expect(resumed.result!.total).toBe(afterOne.result!.total);

    // Advance and finish remaining verses
    let next = advanceDailyRound(resumed, texts);
    expect(next.phase).toBe("playing");
    expect(next.daily!.index).toBe(1);
    for (let i = 1; i < 4; i += 1) {
      const { round: confirmed, appState: state } = confirmGuess(
        next,
        next.poolItem.verseIndex,
        fixed
      );
      if (i < 3) {
        expect(state!.lastDaily!.completedAt).toBeNull();
        expect(state!.lastDaily!.rounds).toHaveLength(i + 1);
        next = advanceDailyRound(confirmed, texts);
      } else {
        expect(state!.lastDaily!.completedAt).not.toBeNull();
        expect(state!.lastDaily!.rounds).toHaveLength(4);
        expect(state!.streak).toBe(1);
        // Full resume lands on final verse with all results
        const full = startDailyRound(pool, texts, fixed);
        expect(full.phase).toBe("revealed");
        expect(full.daily!.results).toHaveLength(4);
        expect(full.daily!.index).toBe(3);
        expect(shareForRound(full)).not.toBeNull();
      }
    }
  });
});
