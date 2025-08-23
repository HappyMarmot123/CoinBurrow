import {
  View as NativeView,
  type ViewProps as NativeViewProps,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export type ViewAtomProps = NativeViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ViewAtom({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ViewAtomProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );

  return <NativeView style={[{ backgroundColor }, style]} {...otherProps} />;
}
