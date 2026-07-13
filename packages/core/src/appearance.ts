/**
 * Color scheme for pure presentation helpers (e.g. mastery heat).
 * Platform theme modules call setColorScheme; core never reads DOM.
 */

export type ColorScheme = "light" | "dark";

let scheme: ColorScheme = "light";

export function setColorScheme(next: ColorScheme): void {
  scheme = next === "dark" ? "dark" : "light";
}

export function getColorScheme(): ColorScheme {
  return scheme;
}
