import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";

export function useReducedMotion() {
  // Start conservatively until the device preference has been read.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}

/** Deliberately reserved for meaningful completion and submission errors. */
export async function feedback(kind: "success" | "error") {
  try {
    if (await AccessibilityInfo.isReduceMotionEnabled()) return;
    await Haptics.notificationAsync(
      kind === "success"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  } catch {
    // Haptics can be unavailable in a simulator or when disabled by iOS.
  }
}
