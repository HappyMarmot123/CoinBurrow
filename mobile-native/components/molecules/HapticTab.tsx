import {
  PlatformPressable,
  PlatformPressableProps,
} from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

export type HapticTabProps = PlatformPressableProps;

export function HapticTab(props: HapticTabProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
