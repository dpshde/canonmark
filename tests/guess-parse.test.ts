import { describe, it, expect } from "vitest";
import { parseGuessText } from "../src/lib/guess-parse";
import { verseIndexFor } from "../src/lib/books";

describe("parseGuessText (grab-bcv)", () => {
  it("parses full book names with verse", () => {
    const r = parseGuessText("Proverbs 11:21");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verseIndex).toBe(verseIndexFor("PRO", 11, 21));
    expect(r.label).toBe("Proverbs 11:21");
  });

  it("parses abbreviations", () => {
    const r = parseGuessText("Jn 3:16");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verseIndex).toBe(verseIndexFor("JHN", 3, 16));
  });

  it("parses OSIS-style refs", () => {
    const r = parseGuessText("GEN.1.1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verseIndex).toBe(1);
  });

  it("chapter-only refs resolve to verse 1", () => {
    const r = parseGuessText("Romans 8");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verseIndex).toBe(verseIndexFor("ROM", 8, 1));
  });

  it("rejects empty and nonsense", () => {
    expect(parseGuessText("").ok).toBe(false);
    expect(parseGuessText("   ").ok).toBe(false);
    expect(parseGuessText("not a verse").ok).toBe(false);
  });
});
