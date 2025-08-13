import React from "react";
import { View, Text, TextInput } from "react-native";
import { InputAtom, type InputAtomProps } from "../atoms/InputAtom";
import { LabelAtom } from "../atoms/LabelAtom";

interface FieldProps extends InputAtomProps {
  label: string;
}

export const Field = React.forwardRef<TextInput, FieldProps>(
  ({ label, error, ...props }, ref) => {
    const errorId = error ? `${props.name}-error` : undefined;

    return (
      <View className="mb-3">
        <LabelAtom htmlFor={props.name}>{label}</LabelAtom>
        <InputAtom ref={ref} error={error} {...props} />
        <View className="min-h-[24px] mt-1">
          {error && (
            <Text id={errorId} className="text-red-500 text-base">
              {error.message}
            </Text>
          )}
        </View>
      </View>
    );
  }
);
