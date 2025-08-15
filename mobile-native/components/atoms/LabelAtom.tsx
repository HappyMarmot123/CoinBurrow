import React from "react";
import { Text, type TextProps } from "react-native";

export const LabelAtom = ({
  className,
  ...props
}: TextProps & { className?: string }) => {
  return (
    <Text
      className={`text-sm font-bold text-gray-700 mb-2 ${className}`}
      {...props}
    />
  );
};
