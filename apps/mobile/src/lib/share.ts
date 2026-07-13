/**
 * Deliver core share text via the OS share sheet.
 */
import { Share, Platform } from "react-native";

export async function shareText(message: string): Promise<boolean> {
  try {
    const result = await Share.share(
      Platform.OS === "ios"
        ? { message }
        : { message, title: "Versemark" }
    );
    // dismissedAction is iOS-only; treat unavailable share as soft failure.
    if (
      result.action === Share.sharedAction ||
      result.action === Share.dismissedAction
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
