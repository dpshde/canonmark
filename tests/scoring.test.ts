import { describe, it, expect } from "vitest";
import {
  distancePoints,
  hintMultiplier,
  scoreRound,
  chapterDistance,
} from "../src/lib/scoring";

describe("distancePoints (ADR half-life 40)", () => {
  it("d=0 → 1000", () => {
    expect(distancePoints(0)).toBe(1000);
  });

  it("d=40 → 500", () => {
    expect(distancePoints(40)).toBe(500);
  });

  it("d=80 → 250", () => {
    expect(distancePoints(80)).toBe(250);
  });

  it("d=1 → 983", () => {
    expect(distancePoints(1)).toBe(983);
  });

  it("d=10 → 841", () => {
    expect(distancePoints(10)).toBe(841);
  });

  it("d=150 → 74", () => {
    expect(distancePoints(150)).toBe(74);
  });

  it("d=300 → 6", () => {
    expect(distancePoints(300)).toBe(6);
  });
});

describe("hintMultiplier", () => {
  it("step 1 → ×3", () => expect(hintMultiplier(1)).toBe(3));
  it("step 2 → ×2", () => expect(hintMultiplier(2)).toBe(2));
  it("step 3 → ×1", () => expect(hintMultiplier(3)).toBe(1));
});

describe("scoreRound", () => {
  it("perfect ×3 = 3000", () => {
    const r = scoreRound(500, 500, 1);
    expect(r.distance).toBe(0);
    expect(r.distancePts).toBe(1000);
    expect(r.multiplier).toBe(3);
    expect(r.total).toBe(3000);
  });

  it("d=40 with step 2 → 500×2=1000", () => {
    const r = scoreRound(100, 140, 2);
    expect(r.distance).toBe(40);
    expect(r.distancePts).toBe(500);
    expect(r.total).toBe(1000);
  });

  it("chapterDistance is absolute", () => {
    expect(chapterDistance(10, 50)).toBe(40);
    expect(chapterDistance(50, 10)).toBe(40);
  });
});
