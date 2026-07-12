/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadThemePreference,
  saveThemePreference,
  nextThemePreference,
  resolvedTheme,
  applyTheme,
  cycleTheme,
  themeLabel,
  type ThemePreference,
} from "../src/lib/theme";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: () => null,
      length: 0,
    },
  });

  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
  document.head.innerHTML = `
    <meta name="theme-color" content="#faf8f4" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  `;
});

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  vi.unstubAllGlobals();
});

function stubScheme(dark: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark && query.includes("prefers-color-scheme: dark"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("theme preference", () => {
  it("defaults to system", () => {
    expect(loadThemePreference()).toBe("system");
  });

  it("persists and loads light/dark/system", () => {
    for (const pref of ["light", "dark", "system"] as ThemePreference[]) {
      saveThemePreference(pref);
      expect(loadThemePreference()).toBe(pref);
    }
  });

  it("ignores invalid stored values", () => {
    mem.set("versemark:theme", "neon");
    expect(loadThemePreference()).toBe("system");
  });

  it("cycles system → light → dark → system", () => {
    expect(nextThemePreference("system")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
  });

  it("labels preferences", () => {
    expect(themeLabel("system")).toBe("System");
    expect(themeLabel("light")).toBe("Light");
    expect(themeLabel("dark")).toBe("Dark");
  });
});

describe("resolvedTheme", () => {
  it("honors explicit light/dark", () => {
    stubScheme(true);
    expect(resolvedTheme("light")).toBe("light");
    expect(resolvedTheme("dark")).toBe("dark");
  });

  it("follows OS when system", () => {
    stubScheme(true);
    expect(resolvedTheme("system")).toBe("dark");
    stubScheme(false);
    expect(resolvedTheme("system")).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets data-theme for light and dark", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");

    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("removes data-theme for system", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    stubScheme(false);
    applyTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("updates theme-color meta for dark", () => {
    stubScheme(true);
    applyTheme("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    expect(meta?.getAttribute("content")).toBe("#1c1916");
  });
});

describe("cycleTheme", () => {
  it("persists the next preference and applies it", () => {
    stubScheme(false);
    saveThemePreference("system");
    expect(cycleTheme()).toBe("light");
    expect(loadThemePreference()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
