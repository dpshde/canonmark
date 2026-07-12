/**
 * Appearance preference — light, dark, or follow the OS.
 */

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "versemark:theme";

const CYCLE: ThemePreference[] = ["system", "light", "dark"];

/** Default follows the OS. */
export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // private mode
  }
  return "system";
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // ignore
  }
}

/** Resolved light/dark after applying system preference. */
export function resolvedTheme(
  pref: ThemePreference = loadThemePreference()
): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

/** Cycle system → light → dark → system. */
export function nextThemePreference(
  pref: ThemePreference = loadThemePreference()
): ThemePreference {
  const i = CYCLE.indexOf(pref);
  return CYCLE[(i + 1) % CYCLE.length]!;
}

/**
 * Write the preference onto <html data-theme> and sync theme-color meta.
 * <pref> of system removes the attribute so CSS @media can win.
 */
export function applyTheme(pref: ThemePreference = loadThemePreference()): void {
  const root = document.documentElement;
  if (pref === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", pref);
  }

  const resolved = resolvedTheme(pref);
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      resolved === "dark" ? "#0f0d0c" : "#faf8f4"
    );
  }

  const status = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (status) {
    status.setAttribute(
      "content",
      resolved === "dark" ? "black-translucent" : "default"
    );
  }
}

/** Persist + apply the next preference in the cycle. Returns the new pref. */
export function cycleTheme(): ThemePreference {
  const next = nextThemePreference();
  saveThemePreference(next);
  applyTheme(next);
  return next;
}

export function themeLabel(pref: ThemePreference): string {
  if (pref === "system") return "System";
  if (pref === "dark") return "Dark";
  return "Light";
}
