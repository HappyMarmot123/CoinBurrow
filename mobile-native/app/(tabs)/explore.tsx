import { Card } from "@/components/atoms/Card";
import { PageTemplate } from "@/components/templates/PageTemplate";
import React from "react";

export default function Explore() {
  return (
    <PageTemplate headerProps={{ title: "Project Principles" }}>
      <Card
        title="Atomic Design"
        description="Components are structured into atoms, molecules, organisms, templates, and pages for scalability and maintainability."
      />
      <Card
        title="TypeScript First"
        description="Strict TypeScript is used everywhere to ensure type safety and improve code quality. Prefer interfaces over types."
      />
      <Card
        title="Declarative UI with NativeWind"
        description="Styling is done using NativeWind for a utility-first CSS approach. StyleSheet.create is a fallback."
      />
      <Card
        title="Expo Ecosystem"
        description="Leverage the full power of Expo's managed workflow, including libraries like expo-router, expo-image, and expo-constants."
      />
    </PageTemplate>
  );
}
