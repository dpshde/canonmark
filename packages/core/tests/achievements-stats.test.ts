import { describe, it, expect } from "vitest";
import {
  buildOverallStats,
  buildGenreStats,
  buildBookStats,
  buildAllGenreStats,
  genreBookCountSum,
  DASH,
} from "../src/achievements-stats";
import type { AppState, RoundRecord } from "../src/storage";
import { emptyAppState } from "../src/storage";
import { BOOKS } from "../src/books";

function r(
  partial: Partial<RoundRecord> &
    Pick<RoundRecord, "trueVerseIndex" | "guessVerseIndex" | "distance">
): RoundRecord {
  const start = partial.trueVerseIndex;
  return {
    trueRef: partial.trueRef ?? "GEN.1.1",
    trueVerseIndex: start,
    trueRangeEndVerseIndex: partial.trueRangeEndVerseIndex ?? start,
    guessVerseIndex: partial.guessVerseIndex,
    distance: partial.distance,
    total: partial.total ?? 1000,
    hintStep: partial.hintStep ?? 1,
    at: partial.at ?? "2026-08-01T12:00:00.000Z",
    source: partial.source ?? "practice",
  };
}

const emptyState = (): AppState => emptyAppState();

describe("buildOverallStats", () => {
  it("empty state → zeros and dashes", () => {
    const s = buildOverallStats(emptyState());
    expect(s.rounds).toBe(0);
    expect(s.dailyRounds).toBe(0);
    expect(s.practiceRounds).toBe(0);
    expect(s.exactCount).toBe(0);
    expect(s.exactRate).toBe(DASH);
    expect(s.unaidedRate).toBe(DASH);
    expect(s.booksTested).toBe(0);
    expect(s.booksTotal).toBe(66);
    expect(s.medianMiss).toBe(DASH);
    expect(s.rows.some((r) => r.key === "Exact rate" && r.value === DASH)).toBe(
      true
    );
  });

  it("non-empty splits daily vs practice and defines exact rate", () => {
    const withDaily: AppState = {
      ...emptyState(),
      practiceLog: [
        r({
          trueVerseIndex: 1,
          guessVerseIndex: 1,
          distance: 0,
          source: "practice",
        }),
      ],
      practiceRounds: 1,
      history: [
        {
          dateKey: "2026-08-02",
          puzzleNumber: 1,
          completedAt: "2026-08-02T12:00:00.000Z",
          guessVerseIndex: 50,
          trueVerseIndex: 1,
          trueRef: "GEN.1.1",
          distance: 49,
          hintStep: 1,
          rounds: [
            r({
              trueVerseIndex: 1,
              guessVerseIndex: 50,
              distance: 49,
              source: "daily",
              at: "2026-08-02T12:00:00.000Z",
            }),
          ],
          total: 100,
        },
      ],
      lifetime: {
        ...emptyState().lifetime,
        scoredRounds: 2,
        exact: 1,
        near: 0,
        sight: 1,
      },
    };
    const s = buildOverallStats(withDaily);
    expect(s.rounds).toBeGreaterThanOrEqual(2);
    expect(s.practiceRounds).toBeGreaterThanOrEqual(1);
    expect(s.dailyRounds).toBeGreaterThanOrEqual(1);
    expect(s.exactRate).not.toBe(DASH);
    expect(s.booksTested).toBeGreaterThanOrEqual(1);
    expect(s.booksTested).toBeLessThanOrEqual(66);
  });
});

describe("buildGenreStats / buildBookStats", () => {
  it("genre lists every book of that genre", () => {
    const g = buildGenreStats(emptyState(), "law");
    const lawCount = BOOKS.filter((b) => b.genre === "law").length;
    expect(g.books.length).toBe(lawCount);
    expect(g.booksTotal).toBe(lawCount);
    expect(g.rounds).toBe(0);
    expect(g.medianMiss).toBe(DASH);
  });

  it("untested book detail shows zeros and dashes", () => {
    const b = buildBookStats(emptyState(), "ROM");
    expect(b).not.toBeNull();
    expect(b!.rounds).toBe(0);
    expect(b!.exactRate).toBe(DASH);
    expect(b!.medianMiss).toBe(DASH);
    expect(b!.unaided).toBe(DASH);
    expect(b!.rows.find((r) => r.key === "Unaided")?.value).toBe(DASH);
  });

  it("sum of genre book counts is 66", () => {
    expect(genreBookCountSum(emptyState())).toBe(66);
    expect(buildAllGenreStats(emptyState()).length).toBe(6);
  });

  it("resolves book by name or osis", () => {
    const byOsis = buildBookStats(emptyState(), "JHN");
    const byName = buildBookStats(emptyState(), "John");
    expect(byOsis?.osis).toBe("JHN");
    expect(byName?.osis).toBe("JHN");
  });
});
