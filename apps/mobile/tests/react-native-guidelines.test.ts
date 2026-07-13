import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(import.meta.dirname, "..");

function read(path: string): string {
  return readFileSync(resolve(mobileRoot, path), "utf8");
}

describe("React Native guideline guardrails", () => {
  it("keeps the long progress ledger virtualized and typed", () => {
    const source = read("src/screens/AchievementsScreen.tsx");

    expect(source).toContain('from "@legendapp/list/react-native"');
    expect(source).toContain("recycleItems");
    expect(source).toContain("getItemType={achievementItemType}");
  });

  it("renders achievement artwork through expo-image", () => {
    const source = read("src/design-system/index.ts");

    expect(source).toContain('export { Image } from "expo-image"');
    expect(read("src/screens/AchievementsScreen.tsx")).not.toMatch(
      /import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*["']react-native["']/s
    );
  });

  it("uses native content inset adjustment on scroll roots", () => {
    for (const path of ["src/screens/PlayScreen.tsx", "src/screens/AchievementsScreen.tsx"]) {
      const source = read(path);
      expect(source).toContain('contentInsetAdjustmentBehavior: "automatic"');
      expect(source).toContain('Platform.OS === "web" ? {}');
    }
  });

  it("keeps rough placement provisional until the gesture ends", () => {
    const source = read("src/components/TimelineStrip.tsx");

    expect(source).toContain("onPanResponderRelease: finishPlacement");
    expect(source).toContain("if (placed != null) onPlace(placed)");
    expect(source).toContain("pickBookLabels(segments, range, axisLength)");
    expect(source).toContain("height: StyleSheet.hairlineWidth, opacity: 0.3");
  });

  it("uses the web precision ruler in the settled book view", () => {
    const source = read("src/components/TimelineStrip.tsx");

    expect(source).toContain("viewportForPrecision");
    expect(source).toContain("precisionChapters(range, displayGuess, axisLength)");
    expect(source).toContain("ACTIVE_NOTCH_LENGTH");
    expect(source).toContain('transform: [{ rotate: "90deg" }]');
  });

  it("pins direct dependency versions in every workspace", () => {
    for (const path of [
      "package.json",
      "../../apps/web/package.json",
      "../../packages/core/package.json",
    ]) {
      const pkg = JSON.parse(read(path)) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const specs = Object.values({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      });

      expect(specs.filter((spec) => !spec.startsWith("workspace:")).every(
        (spec) => !spec.startsWith("^") && !spec.startsWith("~")
      )).toBe(true);
    }
  });
});
