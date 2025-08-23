import clsx from "clsx";
import React, { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

export interface TextInputAtomProps extends TextInputProps {
  error?: boolean;
  inputClassName?: string;
}

export const TextInputAtom = React.forwardRef<TextInput, TextInputAtomProps>(
  ({ error, className, inputClassName, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const staticClasses =
      "w-full bg-white rounded-lg text-gray-900 text-base py-3 px-4 shadow-sm border border-gray-300 focus:border-primary";

    return (
      <TextInput
        ref={ref}
        className={clsx(staticClasses, inputClassName, error && "border-error")}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    );
  }
);
