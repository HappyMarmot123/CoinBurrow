import type { Meta, StoryObj } from "@storybook/react";
import { InputField } from "./InputField";
import { View, TextInput } from "react-native";
import React, { useRef, useState } from "react";

const meta = {
  title: "Example/InputField",
  component: InputField,
  decorators: [
    (Story) => (
      <View style={{ padding: 20, width: "100%" }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    onClear: { action: "cleared" },
    onChangeText: { action: "text changed" },
  },
} satisfies Meta<typeof InputField>;

export default meta;

type Story = StoryObj<typeof InputField>;

const DefaultInputs = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef<TextInput>(null);

  return (
    <>
      <InputField
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        onClear={() => setEmail("")}
        returnKeyType="next"
        onSubmitEditing={() => {
          passwordRef.current?.focus();
        }}
      />
      <InputField
        ref={passwordRef}
        label="Password"
        placeholder="Enter your password"
        isPassword
        value={password}
        onChangeText={setPassword}
        onClear={() => setPassword("")}
      />
    </>
  );
};

export const Default: Story = {
  render: () => <DefaultInputs />,
};

const InputsWithValue = () => {
  const [email, setEmail] = useState("jane.doe@example.com");
  const [password, setPassword] = useState("password123");
  const passwordRef = useRef<TextInput>(null);

  return (
    <>
      <InputField
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        onClear={() => setEmail("")}
        returnKeyType="next"
        onSubmitEditing={() => {
          passwordRef.current?.focus();
        }}
      />
      <InputField
        ref={passwordRef}
        label="Password"
        placeholder="Enter your password"
        isPassword
        value={password}
        onChangeText={setPassword}
        onClear={() => setPassword("")}
      />
    </>
  );
};

export const WithValue: Story = {
  render: () => <InputsWithValue />,
};

const InputsWithError = () => {
  const [email, setEmail] = useState("invalid-email");
  const [password, setPassword] = useState("123");
  const passwordRef = useRef<TextInput>(null);

  return (
    <>
      <InputField
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        onClear={() => setEmail("")}
        error={{ message: "Please enter a valid email." }}
        returnKeyType="next"
        onSubmitEditing={() => {
          passwordRef.current?.focus();
        }}
      />
      <InputField
        ref={passwordRef}
        label="Password"
        placeholder="Enter your password"
        isPassword
        value={password}
        onChangeText={setPassword}
        onClear={() => setPassword("")}
        error={{ message: "Password must be at least 6 characters." }}
      />
    </>
  );
};

export const WithError: Story = {
  render: () => <InputsWithError />,
};
