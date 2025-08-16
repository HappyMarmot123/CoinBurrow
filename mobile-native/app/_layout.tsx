import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import "react-native-reanimated";
import "../global.css";

import { useAuthStore } from "@/core/store/useAuthStore";
import { useColorScheme } from "@/hooks/useColorScheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect } from "react";
import StorybookUIRoot from "../.rnstorybook";

const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { mobileToken, isRehydrated } = useAuthStore();
  const inAuthGroup = (segments[0] as string) === "(auth)";

  React.useEffect(() => {
    if (!isRehydrated) {
      return;
    }
    // The `router.replace` will not work until the layout is mounted.
    if (!mobileToken && !inAuthGroup) {
      router.replace("/Login" as any);
    }
    if (mobileToken && inAuthGroup) {
      router.replace("/" as any);
    }
  }, [mobileToken, segments, isRehydrated]);
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  useProtectedRoute();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="storybook" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  const { isRehydrated } = useAuthStore();
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && isRehydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isRehydrated]);

  if (!loaded || !isRehydrated) {
    return null;
  }

  if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED) {
    return <StorybookUIRoot />;
  }

  return <RootLayoutNav />;
}
