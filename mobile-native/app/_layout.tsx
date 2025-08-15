import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import "react-native-reanimated";
import "../global.css";

import { useAuthStore } from "@/app/core/store/useAuthStore";
import { useColorScheme } from "@/hooks/useColorScheme";
import React from "react";
import StorybookUIRoot from "../.rnstorybook";

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { mobileToken } = useAuthStore();
  const inAuthGroup = (segments[0] as string) === "(auth)";

  React.useEffect(() => {
    if (!mobileToken && !inAuthGroup) {
      router.replace("/login" as any);
    }
    if (mobileToken && inAuthGroup) {
      router.replace("/" as any);
    }
  }, [mobileToken, segments]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useProtectedRoute();

  if (!loaded) {
    return null;
  }

  if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED) {
    return <StorybookUIRoot />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="storybook" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
