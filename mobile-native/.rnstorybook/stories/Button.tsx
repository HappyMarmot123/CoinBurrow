import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type TouchableOpacityProps,
  ActivityIndicator,
  View,
} from "react-native";

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
}

export const Button = ({
  title,
  isLoading = false,
  disabled,
  style,
  ...props
}: ButtonProps) => {
  const isDisabled = isLoading || disabled;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.disabled, style]}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#F5F5F5" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#FF5C00",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#F5F5F5",
  },
});
