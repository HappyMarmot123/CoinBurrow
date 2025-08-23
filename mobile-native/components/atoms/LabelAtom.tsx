import React from "react";
import { Text, type TextProps } from "react-native";

interface LabelAtomProps extends TextProps {
  children: React.ReactNode;
}

export function LabelAtom({ children, className, ...props }: LabelAtomProps) {
  return (
    <Text
      className={`text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ${className}`}
      {...props}
    >
      {children}
    </Text>
  );
}
