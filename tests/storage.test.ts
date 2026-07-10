import { describe, it, expect, beforeEach } from "vitest";
import {
  computeStreak,
  getDailyForPuzzle,
  isDailyComplete,
  loadState,
  recordDailyResult,
  type DailyResultRecord,
} from "../src/lib/storage";

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

function partial(n: number, dateKey: string, rounds: number): DailyResultRecord {
  const list = Array.from({ length: rounds }, (_, i) => ({
    trueRef: `REF.${i}`,
    trueVerseIndex: 100 + i,
    trueRangeEndVerseIndex: 100 + i,
    guessVerseIndex: 100 + i,
    distance: 0,
    total: 900,
    hintStep: 1,
    at: `${dateKey}T12:00:00.000Z`,
    source: "daily" as const,
  }));
  const last = list[list.length - 1];
  return {
    puzzleNumber: n,
    dateKey,
    guessVerseIndex: last.guessVerseIndex,
    trueVerseIndex: last.trueVerseIndex,
    trueRef: last.trueRef,
    distance: last.distance,
    total: list.reduce((s, r) => s + r.total, 0),
    hintStep: last.hintStep,
    completedAt: null,
    rounds: list,
  };
}

function complete(n: number, dateKey: string, at: string): DailyResultRecord {
  const rec = partial(n, dateKey, 4);
  return { ...rec, completedAt: at };
}

describe("daily progress storage", () => {
  it("saves and loads partial progress without counting streak", () => {
    const now = new Date(2026, 7, 15);
    const state = recordDailyResult(partial(15, "2026-08-15", 2), now);
    expect(state.history).toHaveLength(1);
    expect(state.streak).toBe(0);
    expect(isDailyComplete(state.lastDaily!)).toBe(false);

    const loaded = getDailyForPuzzle(15);
    expect(loaded?.rounds).toHaveLength(2);
    expect(loaded?.completedAt).toBeNull();
  });

  it("upgrades partial to complete and counts streak", () => {
    const now = new Date(2026, 7, 15);
    recordDailyResult(partial(15, "2026-08-15", 2), now);
    const done = recordDailyResult(
      complete(15, "2026-08-15", now.toISOString()),
      now
    );
    expect(done.history).toHaveLength(1);
    expect(done.history[0].rounds).toHaveLength(4);
    expect(done.streak).toBe(1);
    expect(isDailyComplete(done.lastDaily!)).toBe(true);
  });

  it("computeStreak ignores in-progress days", () => {
    const history = [
      complete(13, "2026-08-13", "2026-08-13T12:00:00.000Z"),
      complete(14, "2026-08-14", "2026-08-14T12:00:00.000Z"),
      partial(15, "2026-08-15", 1),
    ];
    // Today incomplete → streak from yesterday backward
    expect(computeStreak(history, "2026-08-15")).toBe(2);
    // Mark today complete
    history[2] = complete(15, "2026-08-15", "2026-08-15T18:00:00.000Z");
    expect(computeStreak(history, "2026-08-15")).toBe(3);
  });

  it("loadState normalizes legacy completedAt strings", () => {
    mem.set(
      "versemark:v2",
      JSON.stringify({
        lastDaily: {
          puzzleNumber: 1,
          dateKey: "2026-08-01",
          guessVerseIndex: 10,
          trueVerseIndex: 10,
          trueRef: "GEN.1.1",
          distance: 0,
          total: 3000,
          hintStep: 1,
          completedAt: "2026-08-01T10:00:00.000Z",
          rounds: [
            {
              trueRef: "GEN.1.1",
              trueVerseIndex: 10,
              guessVerseIndex: 10,
              distance: 0,
              total: 3000,
              hintStep: 1,
            },
          ],
        },
        history: [
          {
            puzzleNumber: 1,
            dateKey: "2026-08-01",
            guessVerseIndex: 10,
            trueVerseIndex: 10,
            trueRef: "GEN.1.1",
            distance: 0,
            total: 3000,
            hintStep: 1,
            completedAt: "2026-08-01T10:00:00.000Z",
            rounds: [
              {
                trueRef: "GEN.1.1",
                trueVerseIndex: 10,
                guessVerseIndex: 10,
                distance: 0,
                total: 3000,
                hintStep: 1,
              },
            ],
          },
        ],
        streak: 1,
        bestStreak: 1,
      })
    );
    const state = loadState();
    expect(isDailyComplete(state.lastDaily!)).toBe(true);
    expect(getDailyForPuzzle(1)?.total).toBe(3000);
  });
});
