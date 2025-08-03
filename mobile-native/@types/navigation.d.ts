import { IconName } from "@/components/atoms/Icon";

declare global {
  namespace ReactNavigation {
    interface BottomTabNavigationOptions {
      tabBarIconName?: IconName;
    }
  }
}

// This file needs to be a module.
export {};
