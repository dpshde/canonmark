import { describe, it, expect } from "vitest";
import { withAlpha } from "../src/lib/strip";

describe("withAlpha", () => {
  it("adds alpha to oklch without a slash", () => {
    expect(withAlpha("oklch(0.985 0.003 50)", 0)).toBe(
      "oklch(0.985 0.003 50 / 0)"
    );
  });

  it("replaces existing oklch alpha", () => {
    expect(withAlpha("oklch(0.985 0.003 50 / 1)", 0.4)).toBe(
      "oklch(0.985 0.003 50 / 0.4)"
    );
  });

  it("converts hex to rgba", () => {
    expect(withAlpha("#faf8f4", 0)).toBe("rgba(250, 248, 244, 0)");
  });
});
