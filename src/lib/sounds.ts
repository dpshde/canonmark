/**
 * Sparse SND sine tones (https://snd.dev/ kit 01).
 * Only the round reveal — no scrub ticks, typing, or chrome noise.
 */
import Snd from "snd-lib";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

let snd: Snd | null = null;
let ready = false;

function allowed(): boolean {
  return (
    typeof window !== "undefined" &&
    ready &&
    snd != null &&
    !window.matchMedia(REDUCED_MOTION).matches
  );
}

function play(key: string, volume: number): void {
  if (!allowed() || !snd) return;
  try {
    snd.play(key, { volume });
  } catch {
    /* audio blocked or not ready */
  }
}

/** Load the sine kit after first paint; safe to call once from main. */
export async function initSounds(): Promise<void> {
  if (typeof window === "undefined" || snd) return;
  try {
    snd = new Snd({ muteOnWindowBlur: true, easySetup: false });
    Snd.masterVolume = 0.35;
    await snd.load(Snd.KITS.SND01);
    ready = true;
  } catch {
    ready = false;
    snd = null;
  }
}

/** Only moment that earns a tone: confirming a guess. */
export function soundResult(exact: boolean): void {
  if (exact) {
    play(Snd.SOUNDS.CELEBRATION, 0.38);
  } else {
    play(Snd.SOUNDS.NOTIFICATION, 0.32);
  }
}
