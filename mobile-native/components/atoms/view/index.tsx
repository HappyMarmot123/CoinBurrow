import {
  View as NativeView,
  type ViewProps as NativeViewProps,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { ViewProps } from "./type";

export function View({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );

  return <NativeView style={[{ backgroundColor }, style]} {...otherProps} />;
}
