/**
 * Web share delivery. Pure string builders live in @versemark/core.
 */
export {
  APP_URL,
  buildDailyShareString,
  buildShareString,
  formatPoints,
  formatShareDate,
  formatShareDateForPuzzle,
  type DailyShareRound,
  type SharePayload,
} from "@versemark/core";

/**
 * Share via OS sheet when available (text payload includes the site URL).
 * Otherwise copy to clipboard.
 */
export async function shareText(text: string): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
