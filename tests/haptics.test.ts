import { describe, it, expect, beforeEach, vi } from "vitest";

const triggerMock = vi.fn(() => Promise.resolve());

vi.mock("web-haptics", () => ({
  WebHaptics: class {
    static isSupported = true;
    trigger = triggerMock;
  },
}));

vi.mock("../src/lib/sounds", () => ({
  soundResult: vi.fn(),
}));

import {
  HAPTIC_PATTERNS,
  triggerHaptic,
  hapticLight,
  hapticSelection,
  hapticResult,
  resetHapticsForTests,
} from "../src/lib/haptics";
import { soundResult } from "../src/lib/sounds";

beforeEach(() => {
  triggerMock.mockClear();
  triggerMock.mockImplementation(() => Promise.resolve());
  resetHapticsForTests();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      matchMedia: () => ({ matches: false }),
    },
  });
});

describe("haptics", () => {
  it("exposes raw duration patterns (not named presets)", () => {
    expect(HAPTIC_PATTERNS.light).toBe(12);
    expect(HAPTIC_PATTERNS.selection).toBe(8);
    expect(HAPTIC_PATTERNS.medium).toBe(22);
    expect(HAPTIC_PATTERNS.success).toEqual([16, 40, 16]);
  });

  it("lazy-triggers web-haptics with a duration number", async () => {
    await triggerHaptic(HAPTIC_PATTERNS.light);
    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock).toHaveBeenCalledWith(12);
  });

  it("passes success as an on/off duration array", async () => {
    await triggerHaptic(HAPTIC_PATTERNS.success, { bypassThrottle: true });
    expect(triggerMock).toHaveBeenCalledWith([16, 40, 16]);
  });

  it("throttles rapid fires unless bypassed", async () => {
    await triggerHaptic(12);
    await triggerHaptic(12);
    expect(triggerMock).toHaveBeenCalledTimes(1);
    await triggerHaptic(12, { bypassThrottle: true });
    expect(triggerMock).toHaveBeenCalledTimes(2);
  });

  it("fails open and stops retrying after a hard error", async () => {
    triggerMock.mockImplementationOnce(() => Promise.reject(new Error("vibrate")));
    await triggerHaptic(12);
    await triggerHaptic(22, { bypassThrottle: true });
    expect(triggerMock).toHaveBeenCalledTimes(1);
  });

  it("skips when reduced motion is preferred", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        matchMedia: () => ({ matches: true }),
      },
    });
    await triggerHaptic(12);
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it("hapticLight and hapticSelection use the light/selection pulses", async () => {
    hapticLight();
    await Promise.resolve();
    expect(triggerMock).toHaveBeenCalledWith(12);
    triggerMock.mockClear();
    hapticSelection();
    await Promise.resolve();
    expect(triggerMock).toHaveBeenCalledWith(8);
  });

  it("hapticResult plays success pattern and sound on a hit", async () => {
    hapticResult(true);
    await Promise.resolve();
    expect(triggerMock).toHaveBeenCalledWith([16, 40, 16]);
    expect(soundResult).toHaveBeenCalledWith(true);
  });

  it("hapticResult uses medium on a miss", async () => {
    hapticResult(false);
    await Promise.resolve();
    expect(triggerMock).toHaveBeenCalledWith(22);
    expect(soundResult).toHaveBeenCalledWith(false);
  });
});
