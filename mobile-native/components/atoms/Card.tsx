import { Text } from "@/components/atoms/Text";
import { View } from "@/components/atoms/View";
import React from "react";

export interface CardProps {
  title: string;
  description: string;
}

export function Card({ title, description }: CardProps) {
  return (
    <View className="p-4 my-2 border border-gray-300 rounded-lg dark:border-gray-700">
      <Text type="subtitle">{title}</Text>
      <Text>{description}</Text>
    </View>
  );
}
