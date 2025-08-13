import { IconName } from "@/components/atoms/IconAtom";

declare global {
  namespace ReactNavigation {
    interface BottomTabNavigationOptions {
      tabBarIconName?: IconName;
    }
  }
}

// This file needs to be a module.
export {};
