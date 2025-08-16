import React from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";

export interface ButtonAtomProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  className?: string;
}

export const ButtonAtom = ({
  title,
  isLoading = false,
  disabled,
  className,
  ...props
}: ButtonAtomProps) => {
  const isDisabled = isLoading || disabled;

  return (
    <TouchableOpacity
      className={`flex-row items-center  justify-center rounded-md bg-primary px-4 py-3 ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#F5F5F5" />
      ) : (
        <Text className="text-center text-base font-bold text-secondary">
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
