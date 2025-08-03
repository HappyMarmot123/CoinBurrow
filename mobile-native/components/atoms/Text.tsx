import clsx from "clsx";
import {
  Text as NativeText,
  type TextProps as NativeTextProps,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export interface TextProps extends NativeTextProps {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
  className?: string;
}

export function Text({
  style,
  lightColor,
  darkColor,
  type = "default",
  className,
  ...rest
}: TextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  const typeStyles = {
    default: "text-base leading-6",
    title: "text-3xl font-bold leading-8",
    defaultSemiBold: "text-base leading-6 font-semibold",
    subtitle: "text-xl font-bold",
    link: "text-base leading-7 text-blue-500",
  };

  return (
    <NativeText
      style={[{ color }, style]}
      className={clsx(typeStyles[type], className)}
      {...rest}
    />
  );
}
