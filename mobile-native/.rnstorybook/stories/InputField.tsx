import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export interface InputFieldProps extends TextInputProps {
  label: string;
  isPassword?: boolean;
  error?: { message: string };
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const InputField = React.forwardRef<TextInput, InputFieldProps>(
  (
    { label, value, isPassword = false, error, onClear, style, ...props },
    ref
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const togglePasswordVisibility = () => {
      setIsPasswordVisible((prev) => !prev);
    };

    const hasValue = value && value.length > 0;

    const getRightPadding = () => {
      let padding = 16; // default pr-4
      if (isPassword) {
        padding = 60;
        if (hasValue && onClear) {
          padding = 90;
        }
      } else if (hasValue && onClear) {
        padding = 50;
      }
      return padding;
    };

    const inputStyle = [
      styles.input,
      { paddingRight: getRightPadding() },
      error ? { borderColor: "#EF4444" } : {},
      isFocused ? styles.inputFocused : {},
    ];

    return (
      <View style={[styles.container, style]}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={ref}
            style={inputStyle}
            secureTextEntry={isPassword && !isPasswordVisible}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor="#9CA3AF"
            blurOnSubmit={false}
            {...props}
          />
          <View style={styles.buttonsContainer}>
            {hasValue && onClear && (
              <TouchableOpacity
                onPress={onClear}
                style={styles.clearButton}
                aria-label={`Clear ${label}`}
              >
                <Text style={styles.clearButtonText}>X</Text>
              </TouchableOpacity>
            )}
            {isPassword && (
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                style={styles.toggleButton}
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
              >
                <Text style={styles.toggleButtonText}>
                  {isPasswordVisible ? "숨김" : "표시"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.errorContainer}>
          {error && <Text style={styles.errorText}>{error.message}</Text>}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "white",
    borderColor: "#D1D5DB",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    elevation: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    width: "100%",
  },
  inputFocused: {
    borderColor: "#6B7280",
    borderWidth: 2,
  },
  buttonsContainer: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: "100%",
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  clearButtonText: {
    color: "#6B7280",
    fontWeight: "bold",
    fontSize: 14,
  },
  toggleButton: {
    padding: 6,
  },
  toggleButtonText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  errorContainer: {
    minHeight: 24,
    marginTop: 4,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
});
