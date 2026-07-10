/**
 * Parse free-text Bible references into canon verse indices via grab-bcv.
 */
import { tryParsePassage } from "grab-bcv";
import { verseIndexFor, formatVerseLabel } from "./books";
import type { OsisBookCode } from "grab-bcv";

export type GuessParseResult =
  | { ok: true; verseIndex: number; label: string; input: string }
  | { ok: false; reason: "empty" | "invalid" | "out_of_range"; input: string };

/**
 * Parse a typed reference into a global verse index.
 * Chapter-only refs (e.g. "Romans 8") resolve to verse 1 of that chapter.
 */
export function parseGuessText(raw: string): GuessParseResult {
  const input = raw.trim();
  if (!input) return { ok: false, reason: "empty", input: raw };

  const parsed = tryParsePassage(input);
  if (!parsed.ok) return { ok: false, reason: "invalid", input };

  const book = parsed.value.start.book as OsisBookCode;
  const chapter = parsed.value.start.chapter;
  const verse = parsed.value.start.verse ?? 1;

  const verseIndex = verseIndexFor(book, chapter, verse);
  if (verseIndex == null) {
    return { ok: false, reason: "out_of_range", input };
  }

  return {
    ok: true,
    verseIndex,
    label: formatVerseLabel(verseIndex),
    input,
  };
}
