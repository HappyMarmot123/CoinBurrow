import { Text } from "@/components/atoms/Text";
import { View } from "@/components/atoms/View";
import React from "react";

export interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <View className="items-center border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black">
      <Text type="title">{title}</Text>
    </View>
  );
}
