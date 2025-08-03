import { type TextProps as NativeTextProps } from "react-native";

export type TextProps = NativeTextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};
