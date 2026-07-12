/**
 * Thin fail-open wrapper over `web-haptics` (Vibration API).
 *
 * Same shape as route.bible: lazy singleton, 35ms throttle, raw duration
 * patterns (not named presets — intensity-PWM presets feel like no-ops on
 * many Android devices). Failures never block UX.
 */
import { WebHaptics } from "web-haptics";
import { soundResult } from "./sounds";

const MIN_HAPTIC_INTERVAL = 35;
/** Scrub ticks can be denser than generic taps. */
const SELECTION_INTERVAL_MS = 28;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Single numbers = one pulse (ms). Arrays = alternating on/off (Vibration API).
 * Prefer raw durations over library preset names — presets are intensity-PWM'd
 * into sub-10ms chops that many phones barely feel.
 */
export const HAPTIC_PATTERNS = {
  selection: 8,
  light: 12,
  medium: 22,
  success: [16, 40, 16],
  warning: [24, 60, 24],
} as const;

type HapticPattern = number | readonly number[];

type HapticTriggerOptions = {
  bypassThrottle?: boolean;
};

let webHaptics: WebHaptics | null = null;
let hapticsUnavailable = false;
let lastHapticAt = 0;
let lastSelectionAt = 0;

/** Test-only: clear singleton / throttle / dead-letter state. */
export function resetHapticsForTests(): void {
  webHaptics = null;
  hapticsUnavailable = false;
  lastHapticAt = 0;
  lastSelectionAt = 0;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.(REDUCED_MOTION).matches === true
  );
}

/**
 * Fire a haptic pattern. Never throws; never blocks the caller.
 * Call sites should `void` / fire-and-forget so launches stay in the gesture.
 */
export function triggerHaptic(
  pattern: HapticPattern,
  options: HapticTriggerOptions = {}
): Promise<void> {
  if (hapticsUnavailable || prefersReducedMotion()) {
    return Promise.resolve();
  }

  const now = Date.now();
  if (!options.bypassThrottle && now - lastHapticAt < MIN_HAPTIC_INTERVAL) {
    return Promise.resolve();
  }
  lastHapticAt = now;

  try {
    webHaptics ??= new WebHaptics();
    const input: number | number[] =
      typeof pattern === "number" ? pattern : Array.from(pattern);

    return webHaptics.trigger(input).catch(() => {
      hapticsUnavailable = true;
    });
  } catch {
    hapticsUnavailable = true;
    return Promise.resolve();
  }
}

/** A restrained ruler tick; rate-limited for fast verse scrubbing. */
export function hapticSelection(): void {
  const now = Date.now();
  if (now - lastSelectionAt < SELECTION_INTERVAL_MS) return;
  lastSelectionAt = now;
  void triggerHaptic(HAPTIC_PATTERNS.selection, { bypassThrottle: true });
}

export function hapticLight(): void {
  void triggerHaptic(HAPTIC_PATTERNS.light);
}

export function hapticResult(correct: boolean): void {
  // Incorrect guess is a normal outcome, not an error condition.
  void triggerHaptic(
    correct ? HAPTIC_PATTERNS.success : HAPTIC_PATTERNS.medium,
    { bypassThrottle: true }
  );
  soundResult(correct);
}

/** Wire light ticks on button/link taps (and medium on keyboard activation). */
export function bindTapHaptics(root: ParentNode = document): void {
  const findInteractive = (target: EventTarget | null): Element | null => {
    if (!(target instanceof Element)) return null;
    return target.closest("button, a, [role='button']");
  };

  root.addEventListener(
    "click",
    (event) => {
      if (!findInteractive(event.target)) return;
      void triggerHaptic(HAPTIC_PATTERNS.light);
    },
    { passive: true }
  );

  root.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    if (!findInteractive(event.target)) return;
    void triggerHaptic(HAPTIC_PATTERNS.medium);
  });
}
