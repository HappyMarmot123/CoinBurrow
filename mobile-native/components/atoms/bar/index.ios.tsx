import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";

import { useBottomTabOverflow } from "@/hooks/use-bottom-tab-overflow";

export default function TabBarBackground() {
  const bottom = useBottomTabOverflow();
  if (Platform.OS !== "ios") {
    return null;
  }
  return (
    <BlurView
      intensity={95}
      tint="light"
      style={[
        StyleSheet.absoluteFill,
        {
          overflow: "hidden",
          paddingBottom: bottom,
        },
      ]}
    />
  );
}
