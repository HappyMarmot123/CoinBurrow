import { ViewAtom } from "@/components/atoms/ViewAtom";
import { TabButton } from "@/components/molecules/TabButton";
import { BottomTabBarProps as TabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { bottom } = useSafeAreaInsets();

  function tabButtons() {
    return state.routes.map((route, index) => {
      const { options } = descriptors[route.key];

      const label = options.title !== undefined ? options.title : route.name;
      const isFocused = state.index === index;
      const iconName = (options as any).tabBarIconName || "help-circle";

      const onPress = () => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      };

      const onLongPress = () => {
        navigation.emit({
          type: "tabLongPress",
          target: route.key,
        });
      };

      return (
        <TabButton
          key={route.key}
          label={label}
          isFocused={isFocused}
          onPress={onPress}
          onLongPress={onLongPress}
          iconName={iconName}
        />
      );
    });
  }

  return (
    <ViewAtom
      className="absolute bottom-0 w-full flex-row"
      style={{ paddingBottom: bottom }}
    >
      <ViewAtom />
      {tabButtons()}
    </ViewAtom>
  );
}
