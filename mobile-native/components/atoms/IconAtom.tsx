import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ComponentProps } from "react";

export type IconName = ComponentProps<typeof MaterialIcons>["name"];

export interface IconAtomProps {
  name: IconName;
  color: string;
  size: number;
}

export function IconAtom({ name, color, size }: IconAtomProps) {
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={color}
      style={{ lineHeight: size, height: size, width: size }}
    />
  );
}
