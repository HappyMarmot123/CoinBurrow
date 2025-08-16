import { TabBar } from "@/components/organisms/TabBar";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: "Home",
          // @ts-ignore
          tabBarIconName: "home",
        }}
      />
      <Tabs.Screen
        name="Explore"
        options={{
          title: "Explore",
          // @ts-ignore
          tabBarIconName: "send",
        }}
      />
    </Tabs>
  );
}
