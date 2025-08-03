import { BlurView } from "expo-blur";
import { Platform } from "react-native";

import { useBottomTabOverflow } from "@/hooks/use-bottom-tab-overflow";

export default function Bar() {
  const bottom = useBottomTabOverflow();
  if (Platform.OS !== "ios") {
    return null;
  }
  return (
    <BlurView
      intensity={95}
      tint="light"
      className="absolute inset-0 overflow-hidden"
      style={{ paddingBottom: bottom }}
    />
  );
}
