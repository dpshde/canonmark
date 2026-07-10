/**
 * Parse free-text Bible references into canon verse indices via grab-bcv.
 * Autocomplete mirrors the passage pickers in type-the-word / route-bible.
 */
import {
  autocompletePassage,
  tryParsePassage,
  type AutocompletePassageSuggestion,
  type OsisBookCode,
} from "grab-bcv";
import { verseIndexFor, formatVerseLabel } from "./books";

export type GuessParseResult =
  | { ok: true; verseIndex: number; label: string; input: string }
  | { ok: false; reason: "empty" | "invalid" | "out_of_range"; input: string };

export type GuessSuggestion = AutocompletePassageSuggestion;

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

/**
 * Passage autocomplete for the guess field (grab-bcv).
 * Drops the exact-current-token suggestion so the list only advances the draft.
 */
export function suggestGuessPassages(
  raw: string,
  limit = 6
): GuessSuggestion[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return autocompletePassage(trimmed, { limit }).filter(
    (suggestion) => suggestion.insertText !== trimmed
  );
}

/**
 * Progressive insert text: book → ready for chapter; chapter → ready for verse.
 * Verse/range inserts as-is so a complete ref can be confirmed.
 */
export function progressiveInsertText(suggestion: GuessSuggestion): string {
  if (suggestion.kind === "book") return `${suggestion.insertText} `;
  if (suggestion.kind === "chapter") return `${suggestion.insertText}:`;
  return suggestion.insertText;
}
