import { Card } from "@/components/atoms/card";
import { PageTemplate } from "@/components/templates/PageTemplate";
import React from "react";

export default function HomeScreen() {
  return (
    <PageTemplate headerProps={{ title: "Welcome to CoinBurrow" }}>
      <Card
        title="Step 1: Explore the Structure"
        description="Familiarize yourself with the Atomic Design structure in the components directory. See how atoms, molecules, and organisms work together."
      />
      <Card
        title="Step 2: Check the Rules"
        description="Review the .cursorrules file to understand the project's coding standards, architectural principles, and best practices."
      />
      <Card
        title="Step 3: Modify and Create"
        description="Try creating a new component or modifying an existing one. Follow the established patterns to maintain consistency."
      />
    </PageTemplate>
  );
}
