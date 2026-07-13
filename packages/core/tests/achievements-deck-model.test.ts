import { describe, it, expect } from "vitest";
import {
  buildDeckModel,
  buildTrailNodes,
  pulseHeadline,
  stageFromProgress,
  ladderForPath,
  PRIMARY_PATH_LABELS,
} from "../src/achievements-deck-model";
import {
  listAchievements,
  nextClosestAchievement,
} from "../src/achievements";
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

/** Sparse practice rounds on a few books with different misses. */
function sparseState(): AppState {
  // GEN.1.1 ≈ verse 1; PSA near mid-OT; JHN NT
  const genStart = BOOKS.find((b) => b.osis === "GEN")!.startVerseIndex;
  const psaStart = BOOKS.find((b) => b.osis === "PSA")!.startVerseIndex;
  const jhnStart = BOOKS.find((b) => b.osis === "JHN")!.startVerseIndex;
  const rounds: RoundRecord[] = [
    r({
      trueVerseIndex: genStart,
      guessVerseIndex: genStart + 500,
      distance: 500,
      trueRef: "GEN.1.1",
    }),
    r({
      trueVerseIndex: genStart + 10,
      guessVerseIndex: genStart + 400,
      distance: 390,
      trueRef: "GEN.1.11",
      at: "2026-08-02T12:00:00.000Z",
    }),
    r({
      trueVerseIndex: psaStart,
      guessVerseIndex: psaStart + 20,
      distance: 20,
      trueRef: "PSA.1.1",
      at: "2026-08-03T12:00:00.000Z",
    }),
    r({
      trueVerseIndex: jhnStart,
      guessVerseIndex: jhnStart,
      distance: 0,
      trueRef: "JHN.1.1",
      at: "2026-08-04T12:00:00.000Z",
    }),
    r({
      trueVerseIndex: jhnStart + 5,
      guessVerseIndex: jhnStart + 2,
      distance: 3,
      trueRef: "JHN.1.6",
      at: "2026-08-05T12:00:00.000Z",
    }),
  ];
  return {
    ...emptyState(),
    practiceLog: rounds,
    practiceRounds: rounds.length,
    lifetime: {
      ...emptyState().lifetime,
      scoredRounds: rounds.length,
      exact: 1,
      near: 1,
      sight: 1,
    },
  };
}

describe("buildDeckModel empty", () => {
  it("collapses to you + index", () => {
    const m = buildDeckModel(emptyState());
    expect(m.empty).toBe(true);
    expect(m.cards).toEqual(["you", "index"]);
    expect(m.you.empty).toBe(true);
    expect(m.next).toBeNull();
  });
});

describe("buildDeckModel non-empty", () => {
  it("includes map, far, close, marks-path, train, index", () => {
    const m = buildDeckModel(sparseState());
    expect(m.empty).toBe(false);
    for (const id of ["you", "map", "far", "close", "marks-path", "train", "index"]) {
      expect(m.cards).toContain(id);
    }
  });

  it("far rows sorted by median distance descending", () => {
    const m = buildDeckModel(sparseState());
    expect(m.far.rows.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < m.far.rows.length; i++) {
      expect(m.far.rows[i - 1]!.medianDistance).toBeGreaterThanOrEqual(
        m.far.rows[i]!.medianDistance
      );
    }
  });

  it("close rows sorted by median distance ascending", () => {
    const m = buildDeckModel(sparseState());
    for (let i = 1; i < m.close.rows.length; i++) {
      expect(m.close.rows[i - 1]!.medianDistance).toBeLessThanOrEqual(
        m.close.rows[i]!.medianDistance
      );
    }
  });

  it("next matches nextClosestAchievement", () => {
    const state = sparseState();
    const m = buildDeckModel(state);
    const list = listAchievements(state);
    const expected = nextClosestAchievement(list);
    if (expected) {
      expect(m.next).not.toBeNull();
      expect(m.next!.id).toBe(expected.id);
      expect(m.next!.title).toBe(expected.title);
    } else {
      expect(m.next).toBeNull();
    }
  });

  it("marks-path trail ≤ 6 and ⊆ full ladder; uses Unaided label for sight", () => {
    const m = buildDeckModel(sparseState());
    const sight = m.marksPath.paths.find((p) => p.key === "sight");
    expect(sight?.label).toBe("Unaided");
    for (const path of m.marksPath.paths) {
      expect(path.nodes.length).toBeLessThanOrEqual(6);
      const fullIds = new Set(path.fullLadder.map((a) => a.id));
      for (const n of path.nodes) {
        expect(fullIds.has(n.id)).toBe(true);
      }
      expect(path.fullLadder.length).toBeGreaterThanOrEqual(path.nodes.length);
    }
    expect(PRIMARY_PATH_LABELS.map((p) => p.label)).toContain("Unaided");
  });

  it("map has 66 segments", () => {
    const m = buildDeckModel(sparseState());
    expect(m.map.segments.length).toBe(66);
  });

  it("train bias sets practice-book action", () => {
    const m = buildDeckModel(sparseState(), "GEN");
    expect(m.train.primaryAction).toBe("practice-book");
    expect(m.train.bookOsis).toBe("GEN");
  });
});

describe("buildTrailNodes", () => {
  it("marks now as first open rung with highest progress", () => {
    const state = sparseState();
    const unlocks = listAchievements(state);
    const exact = ladderForPath(unlocks, "exact");
    const trail = buildTrailNodes(exact, 6);
    const now = trail.filter((n) => n.status === "now");
    expect(now.length).toBeLessThanOrEqual(1);
    if (now[0]) {
      expect(now[0].progress).toBeGreaterThanOrEqual(0);
      expect(now[0].progress).toBeLessThanOrEqual(1);
    }
  });
});

describe("pulseHeadline + stageFromProgress", () => {
  it("empty headline", () => {
    expect(pulseHeadline({ rounds: 0, exactRate: null, chapterShare: null, booksTested: 0 })).toMatch(
      /ledger|mark/i
    );
  });

  it("stage thresholds", () => {
    expect(stageFromProgress(0, 0)).toBe("New");
    expect(stageFromProgress(3, 1)).toBe("Warming");
    expect(stageFromProgress(15, 5)).toBe("Finding");
    expect(stageFromProgress(15, 20)).toBe("Mapping");
    expect(stageFromProgress(80, 30)).toBe("Settled");
    expect(stageFromProgress(250, 50)).toBe("Deep");
  });
});
