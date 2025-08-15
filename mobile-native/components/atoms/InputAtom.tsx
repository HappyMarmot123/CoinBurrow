import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  type TextInputProps,
} from "react-native";

export interface InputAtomProps extends TextInputProps {
  isPassword?: boolean;
  error?: { message?: string };
  onClear?: () => void;
  className?: string;
}

export const InputAtom = React.forwardRef<TextInput, InputAtomProps>(
  ({ value, isPassword = false, error, onClear, className, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const togglePasswordVisibility = () => {
      setIsPasswordVisible((prev) => !prev);
    };

    const hasValue = value && value.length > 0;

    const getRightPadding = () => {
      let padding = "pr-4";
      if (isPassword) {
        padding = "pr-16";
        if (hasValue && onClear) {
          padding = "pr-24";
        }
      } else if (hasValue && onClear) {
        padding = "pr-12";
      }
      return padding;
    };

    const errorClass = error ? "border-red-500" : "border-gray-300";
    const focusClass = isFocused ? "border-gray-500 ring-2 ring-gray-500" : "";

    return (
      <View className="relative w-full justify-center">
        <TextInput
          ref={ref}
          className={`w-full rounded-md border bg-white py-3 pl-4 text-lg leading-tight text-gray-900 shadow-sm transition duration-150 ease-in-out focus:outline-none ${getRightPadding()} ${errorClass} ${focusClass} ${className}`}
          secureTextEntry={isPassword && !isPasswordVisible}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#9CA3AF"
          blurOnSubmit={false}
          {...props}
        />
        <View className="absolute right-0 flex-row items-center pr-2">
          {hasValue && onClear && (
            <TouchableOpacity
              onPress={onClear}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Clear input"
            >
              <Text className="text-lg font-bold text-gray-600">X</Text>
            </TouchableOpacity>
          )}
          {isPassword && (
            <TouchableOpacity
              onPress={togglePasswordVisibility}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              <Text className="text-sm font-semibold text-gray-600">
                {isPasswordVisible ? "숨김" : "표시"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);
