/**
 * Package entry smoke: same surface Expo/web import via @versemark/core.
 */
import { describe, it, expect } from "vitest";
import {
  scoreRound,
  emptyAppState,
  BOOKS,
  setStorageBackend,
  createMemoryKvStore,
  loadState,
  saveState,
  buildOverallStats,
} from "../src/index";

describe("@versemark/core package entry", () => {
  it("exposes scoring and books used by Expo shell", () => {
    expect(BOOKS.length).toBe(66);
    // guess===true, no hints → max points
    const exact = scoreRound(100, 100, 1);
    expect(exact.distance).toBe(0);
    expect(exact.total).toBe((1000 + 500) * 3);
    const mid = scoreRound(100, 140, 1);
    expect(mid.distance).toBe(40);
    expect(mid.total).toBeGreaterThan(0);
    expect(mid.total).toBeLessThan(exact.total);
  });

  it("persists via injected memory KvStore (no localStorage)", () => {
    setStorageBackend(createMemoryKvStore());
    const empty = emptyAppState();
    expect(empty.lifetime.scoredRounds).toBe(0);
    expect(saveState({ ...empty, streak: 3 })).toBe(true);
    const loaded = loadState();
    expect(loaded.streak).toBe(3);
    const stats = buildOverallStats(loaded);
    expect(stats.booksTotal).toBe(66);
  });
});
