/**
 * Fail-open Expo Haptics wrapper — never blocks UX.
 */
import * as Haptics from "expo-haptics";

let unavailable = false;

async function run(fn: () => Promise<void>): Promise<void> {
  if (unavailable) return;
  try {
    await fn();
  } catch {
    unavailable = true;
  }
}

/** Light tick for taps / marker moves. */
export function hapticLight(): void {
  void run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Selection change while scrubbing the timeline. */
export function hapticSelection(): void {
  void run(() => Haptics.selectionAsync());
}

/** Confirm press. */
export function hapticConfirm(): void {
  void run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Result reveal — success = exact/near; otherwise medium. */
export function hapticResult(exactOrNear: boolean): void {
  void run(() =>
    exactOrNear
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
}

/** Test helper — reset dead-letter flag. */
export function resetHapticsForTests(): void {
  unavailable = false;
}
