import { useSafeAreaInsets } from "react-native-safe-area-context";

const BOTTOM_TAB_HEIGHT = 49; // Standard iOS bottom tab height

export function useBottomTabOverflow() {
  const { bottom } = useSafeAreaInsets();
  // Return the larger of the two values to handle safe area
  return Math.max(bottom, BOTTOM_TAB_HEIGHT);
}
