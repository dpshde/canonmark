import { describe, it, expect } from "vitest";
import { bookSegments, FULL_CANON_SPAN } from "../src/lib/axis";
import {
  isOverviewBookLabelCandidate,
  OVERVIEW_LANDMARK_OSIS,
  pickOverviewBookLabels,
} from "../src/lib/strip";

/** Approximate portrait free-band length for a phone overview. */
const PORTRAIT_AXIS_PX = 600;

function lenPxFor(start: number, end: number): number {
  return ((end - start + 1) / FULL_CANON_SPAN) * PORTRAIT_AXIS_PX;
}

function axisPxFor(verseIndex: number): number {
  return ((verseIndex - 1) / FULL_CANON_SPAN) * PORTRAIT_AXIS_PX;
}

describe("overview book labels", () => {
  it("landmarks span Romans through Hebrews plus Revelation", () => {
    expect([...OVERVIEW_LANDMARK_OSIS].sort()).toEqual([
      "EPH",
      "HEB",
      "REV",
      "ROM",
    ]);
  });

  it("keeps post-Gospel landmarks even when short in overview pixels", () => {
    for (const osis of OVERVIEW_LANDMARK_OSIS) {
      const seg = bookSegments().find((s) => s.osis === osis)!;
      const px = lenPxFor(seg.startVerseIndex, seg.endVerseIndex);
      expect(px).toBeLessThan(14);
      expect(isOverviewBookLabelCandidate(px, osis, "vertical")).toBe(true);
    }
  });

  it("still filters ordinary short epistles", () => {
    expect(isOverviewBookLabelCandidate(8, "PHP", "vertical")).toBe(false);
    expect(isOverviewBookLabelCandidate(8, "JUD", "horizontal")).toBe(false);
  });

  it("keeps long books via the length floor", () => {
    expect(isOverviewBookLabelCandidate(20, "GEN", "vertical")).toBe(true);
    expect(isOverviewBookLabelCandidate(30, "PSA", "horizontal")).toBe(true);
  });

  it("places epistle landmarks before ordinary books fill the gaps", () => {
    const segs = bookSegments();
    const candidates = segs.map((seg) => ({
      osis: seg.osis,
      name: seg.name,
      axis: axisPxFor(seg.startVerseIndex),
      lenPx: lenPxFor(seg.startVerseIndex, seg.endVerseIndex),
      landmark: OVERVIEW_LANDMARK_OSIS.has(seg.osis),
    }));
    // Include a long Acts so greedy-without-priority would crowd Ephesians.
    const picked = pickOverviewBookLabels(candidates, 14);
    const osis = picked.map((c) => c.osis);
    expect(osis).toContain("ROM");
    expect(osis).toContain("EPH");
    expect(osis).toContain("HEB");
    expect(osis).toContain("REV");
  });
});
