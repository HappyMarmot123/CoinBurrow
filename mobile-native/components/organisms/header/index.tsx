import { Text } from "@/components/atoms/text";
import { View } from "@/components/atoms/view";
import React from "react";
import { StyleSheet } from "react-native";

import { HeaderProps } from "./type";

export function Header({ title }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text type="title">{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
});
