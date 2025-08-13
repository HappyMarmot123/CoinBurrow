import { PageTemplate } from "@/components/templates/PageTemplate";
import { LoginForm } from "@/components/organisms/LoginForm";
import React from "react";
import { View } from "react-native";

export default function Home() {
  return (
    <PageTemplate headerProps={{ title: "Welcome to CoinBurrow" }}>
      <View className="flex-1 items-center justify-center p-4">
        <LoginForm />
      </View>
    </PageTemplate>
  );
}
