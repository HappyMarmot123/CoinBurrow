import { ButtonAtom } from "@/components/atoms/ButtonAtom";
import { TextAtom } from "@/components/atoms/TextAtom";
import { PageTemplate } from "@/components/templates/PageTemplate";
import { useAuthStore } from "@/core/store/useAuthStore";
import React from "react";
import { View } from "react-native";

export default function Home() {
  const { user, logout } = useAuthStore();

  return (
    <PageTemplate headerProps={{ title: "Home" }}>
      <View className="flex-1 items-center justify-center p-4">
        <TextAtom>Welcome, {user?.username}!</TextAtom>
        <ButtonAtom title="Log Out" onPress={logout} className="mt-4" />
      </View>
    </PageTemplate>
  );
}
