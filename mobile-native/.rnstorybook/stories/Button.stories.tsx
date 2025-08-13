import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Button } from "./Button";
import React from "react";

const meta = {
  title: "Example/Button",
  component: Button,
  decorators: [
    (Story) => (
      <View style={{ padding: 20, flex: 1, justifyContent: "center" }}>
        <Story />
      </View>
    ),
  ],
  args: {
    title: "Press me",
    onPress: () => {
      console.log("Button pressed");
    },
  },
  argTypes: {
    onPress: { action: "pressed" },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const CustomStyle: Story = {
  args: {
    title: "Custom Style",
    style: {
      backgroundColor: "blue",
    },
  },
};
