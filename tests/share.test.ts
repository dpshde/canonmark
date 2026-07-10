import { describe, it, expect } from "vitest";
import {
  buildShareString,
  distanceEmojiBand,
  hintEmoji,
} from "../src/lib/share";

describe("share string", () => {
  it("includes puzzle number and score", () => {
    const s = buildShareString({
      puzzleNumber: 12,
      guessChapterIndex: 100,
      trueChapterIndex: 140,
      distance: 40,
      total: 1500,
      hintStep: 1,
    });
    expect(s).toContain("Canonmark #12");
    expect(s).toContain("40 ch");
    expect(s).toContain("1500 pts");
    expect(s).toContain(hintEmoji(1));
  });

  it("distance band has expected length cells", () => {
    const band = distanceEmojiBand(1, 1189, 7);
    expect(band.length).toBeGreaterThan(5);
    expect(band).toMatch(/\u2B1C|\uD83D\uDD35|\uD83D\uDCCC|\uD83C\uDFAF/);
  });
});
