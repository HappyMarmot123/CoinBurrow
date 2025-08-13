import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { OpaqueColorValue, TextStyle, type StyleProp } from "react-native";

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.right": "chevron-right",
} as const;

export type IconName = keyof typeof MAPPING;

export interface IconAtomProps {
  name: IconName;
  size?: number;
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?:
    | "thin"
    | "light"
    | "regular"
    | "medium"
    | "semibold"
    | "bold"
    | "heavy"
    | "black";
}

export function IconAtom({ name, size = 24, color, style }: IconAtomProps) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
