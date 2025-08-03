import { Text } from "@/components/atoms/text";
import { View } from "@/components/atoms/view";
import React from "react";
import { StyleSheet } from "react-native";

import { CardProps } from "./type";

export function Card({ title, description }: CardProps) {
  return (
    <View style={styles.card}>
      <Text type="subtitle">{title}</Text>
      <Text>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
});
