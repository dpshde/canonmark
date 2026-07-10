import { describe, it, expect } from "vitest";
import {
  CLOSE_BONUS,
  CLOSE_DISTANCE,
  distancePoints,
  EXACT_BONUS,
  hintMultiplier,
  proximityBonus,
  scoreRound,
  verseDistance,
  SCORE_HALF_LIFE,
} from "../src/lib/scoring";

describe(`distancePoints (half-life ${SCORE_HALF_LIFE} verses)`, () => {
  it("d=0 → 1000", () => {
    expect(distancePoints(0)).toBe(1000);
  });

  it("d=half-life → 500", () => {
    expect(distancePoints(SCORE_HALF_LIFE)).toBe(500);
  });

  it("d=2×half-life → 250", () => {
    expect(distancePoints(SCORE_HALF_LIFE * 2)).toBe(250);
  });

  it("d=1 → nearly max", () => {
    expect(distancePoints(1)).toBeGreaterThan(990);
  });

  it("d=250 → solid neighborhood", () => {
    const p = distancePoints(250);
    expect(p).toBeGreaterThan(800);
    expect(p).toBeLessThan(900);
  });
});

describe("proximityBonus", () => {
  it("exact hit earns the full exact bonus", () => {
    expect(proximityBonus(0)).toBe(EXACT_BONUS);
  });

  it(`within ${CLOSE_DISTANCE} verses earns the close bonus`, () => {
    expect(proximityBonus(1)).toBe(CLOSE_BONUS);
    expect(proximityBonus(CLOSE_DISTANCE)).toBe(CLOSE_BONUS);
  });

  it("exact beats close", () => {
    expect(EXACT_BONUS).toBeGreaterThan(CLOSE_BONUS);
  });

  it("beyond the close band earns nothing", () => {
    expect(proximityBonus(CLOSE_DISTANCE + 1)).toBe(0);
    expect(proximityBonus(100)).toBe(0);
  });
});

describe("hintMultiplier", () => {
  it("step 1 → ×3", () => expect(hintMultiplier(1)).toBe(3));
  it("step 2 → ×2", () => expect(hintMultiplier(2)).toBe(2));
  it("step 3 → ×1", () => expect(hintMultiplier(3)).toBe(1));
});

describe("scoreRound", () => {
  it("perfect ×3 includes exact bonus → 4500", () => {
    const r = scoreRound(5000, 5000, 1);
    expect(r.distance).toBe(0);
    expect(r.distancePts).toBe(1000);
    expect(r.proximityBonus).toBe(EXACT_BONUS);
    expect(r.multiplier).toBe(3);
    expect(r.total).toBe((1000 + EXACT_BONUS) * 3);
  });

  it("within 5 ×3 includes close bonus", () => {
    const r = scoreRound(5000, 5003, 1);
    expect(r.distance).toBe(3);
    expect(r.proximityBonus).toBe(CLOSE_BONUS);
    expect(r.total).toBe((r.distancePts + CLOSE_BONUS) * 3);
    expect(r.total).toBeGreaterThan(1000 * 3);
    expect(r.total).toBeLessThan((1000 + EXACT_BONUS) * 3);
  });

  it("d=6 has no proximity bonus", () => {
    const r = scoreRound(5000, 5006, 1);
    expect(r.distance).toBe(6);
    expect(r.proximityBonus).toBe(0);
    expect(r.total).toBe(r.distancePts * 3);
  });

  it("d=half-life with step 2 → 500×2=1000 (no close bonus)", () => {
    const r = scoreRound(1000, 1000 + SCORE_HALF_LIFE, 2);
    expect(r.distance).toBe(SCORE_HALF_LIFE);
    expect(r.distancePts).toBe(500);
    expect(r.proximityBonus).toBe(0);
    expect(r.total).toBe(1000);
  });

  it("verseDistance is absolute", () => {
    expect(verseDistance(10, 50)).toBe(40);
    expect(verseDistance(50, 10)).toBe(40);
  });
});
