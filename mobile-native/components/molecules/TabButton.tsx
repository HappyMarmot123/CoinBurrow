import clsx from "clsx";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { IconAtom, IconName } from "@/components/atoms/IconAtom";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface TabButtonProps {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  iconName: IconName;
}

export function TabButton({
  label,
  isFocused,
  onPress,
  onLongPress,
  iconName,
}: TabButtonProps) {
  const colorScheme = useColorScheme() ?? "light";
  const activeColor = Colors[colorScheme].tint;
  const inactiveColor = Colors[colorScheme].tabIconDefault;

  return (
    <Pressable
      className="flex-1 items-center justify-center py-2"
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
    >
      <View
        className={clsx(
          "p-2 rounded-full",
          isFocused && "bg-blue-100 dark:bg-blue-900"
        )}
      >
        <IconAtom
          name={iconName}
          size={24}
          color={isFocused ? activeColor : inactiveColor}
        />
      </View>
      <Text
        style={{ color: isFocused ? activeColor : inactiveColor }}
        className="text-xs mt-1"
      >
        {label}
      </Text>
    </Pressable>
  );
}
