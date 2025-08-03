import { type ViewProps as NativeViewProps } from "react-native";

export type ViewProps = NativeViewProps & {
  lightColor?: string;
  darkColor?: string;
};
