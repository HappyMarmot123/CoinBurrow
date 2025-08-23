import React, { useState } from "react";
import {
  Controller,
  type Control,
  type FieldError,
  type FieldValues,
  type Path,
} from "react-hook-form";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from "react-native";
import { IconAtom } from "../atoms/IconAtom";
import { LabelAtom } from "../atoms/LabelAtom";
import { TextInputAtom } from "../atoms/TextInputAtom";

interface ControlledInputProps<TFieldValues extends FieldValues>
  extends TextInputProps {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  isPassword?: boolean;
}

export interface InputFieldProps<TFieldValues extends FieldValues>
  extends ControlledInputProps<TFieldValues> {
  error?: FieldError;
}

const ControlledInput = React.forwardRef<TextInput, ControlledInputProps<any>>(
  ({ name, control, label, isPassword = false, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const togglePasswordVisibility = () => {
      setIsPasswordVisible((prev) => !prev);
    };

    return (
      <Controller
        control={control}
        name={name}
        render={({
          field: { onChange, onBlur, value, ref: fieldRef },
          fieldState: { error },
        }) => {
          const hasValue = value && value.length > 0;

          return (
            <View className="w-full">
              <LabelAtom>{label}</LabelAtom>
              <View className="relative justify-center">
                <TextInputAtom
                  ref={(input) => {
                    fieldRef(input);
                    if (typeof ref === "function") {
                      ref(input);
                    }
                  }}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={isPassword && !isPasswordVisible}
                  error={!!error}
                  inputClassName={isPassword ? "pr-24" : "pr-12"}
                  blurOnSubmit={false}
                  {...props}
                />
                <View className="absolute right-0 flex-row items-center pr-2">
                  {hasValue && (
                    <TouchableOpacity
                      onPress={() => onChange("")}
                      className="p-2"
                      aria-label={`Clear ${label}`}
                    >
                      <IconAtom name="cancel" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                  {isPassword && (
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className="p-2"
                      aria-label={
                        isPasswordVisible ? "Hide password" : "Show password"
                      }
                    >
                      <IconAtom
                        name={
                          isPasswordVisible ? "visibility-off" : "visibility"
                        }
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View className="min-h-[24px] mt-1">
                {error && (
                  <Text className="text-error text-sm">{error.message}</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    );
  }
);

export const InputField = React.forwardRef<TextInput, InputFieldProps<any>>(
  (props, ref) => {
    return <ControlledInput {...props} ref={ref} />;
  }
);
