/**
 * Wordle-style share string for daily results.
 */
import type { HintStep } from "./scoring";
import { TOTAL_CHAPTERS } from "./books";

const APP_URL = "https://canonmark.app";

/**
 * Encode distance on a 7-cell mini-timeline:
 * true position = pushpin, guess = blue circle, empty = white square.
 */
export function distanceEmojiBand(
  guessChapterIndex: number,
  trueChapterIndex: number,
  cells = 7
): string {
  const truePos = Math.min(
    cells - 1,
    Math.max(0, Math.round(((trueChapterIndex - 1) / (TOTAL_CHAPTERS - 1)) * (cells - 1)))
  );
  let guessPos = Math.min(
    cells - 1,
    Math.max(
      0,
      Math.round(((guessChapterIndex - 1) / (TOTAL_CHAPTERS - 1)) * (cells - 1))
    )
  );
  if (guessPos === truePos && guessChapterIndex !== trueChapterIndex) {
    guessPos = Math.min(cells - 1, truePos + (guessChapterIndex > trueChapterIndex ? 1 : -1));
    if (guessPos < 0) guessPos = truePos + 1;
  }

  const row: string[] = [];
  for (let i = 0; i < cells; i++) {
    if (i === truePos && i === guessPos) row.push("\uD83C\uDFAF");
    else if (i === truePos) row.push("\uD83D\uDCCC");
    else if (i === guessPos) row.push("\uD83D\uDD35");
    else row.push("\u2B1C");
  }
  return row.join("");
}

export function hintEmoji(hintStep: HintStep): string {
  if (hintStep === 1) return "\uD83D\uDFe1";
  if (hintStep === 2) return "\uD83D\uDFE0";
  return "\uD83D\uDD34";
}

export interface SharePayload {
  puzzleNumber: number;
  guessChapterIndex: number;
  trueChapterIndex: number;
  distance: number;
  total: number;
  hintStep: HintStep;
}

export function buildShareString(p: SharePayload): string {
  const band = distanceEmojiBand(p.guessChapterIndex, p.trueChapterIndex);
  const hint = hintEmoji(p.hintStep);
  return [
    `Canonmark #${p.puzzleNumber}`,
    `${band} ${hint}`,
    `${p.distance} ch \u00B7 ${p.total} pts`,
    APP_URL,
  ].join("\n");
}
