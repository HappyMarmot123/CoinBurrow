import { LoginForm } from "@/components/organisms/LoginForm";
import { PageTemplate } from "@/components/templates/PageTemplate";
import React from "react";
import { View } from "react-native";

export default function LoginScreen() {
  return (
    <PageTemplate headerProps={{ title: "Welcome to CoinBurrow" }}>
      <View>
        <LoginForm />
      </View>
    </PageTemplate>
  );
}
