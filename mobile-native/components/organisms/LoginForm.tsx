import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { Alert, TextInput, View } from "react-native";

import { LoginRequestDto, LoginResponseDto } from "@/core/dto/auth.dto";
import { useLoginMutation } from "@/core/hooks/useLoginMutation";
import { loginSchema } from "@/core/schemas/auth.schema";
import { ButtonAtom } from "../atoms/ButtonAtom";
import { InputField } from "../molecules/InputField";

// TODO: Add onSubmitEditing to focus next field

const MAX_PASSWORD_LENGTH = 6;

interface LoginFormProps {
  onSuccess?: (data: LoginResponseDto) => void;
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginRequestDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const passwordRef = React.useRef<TextInput>(null);
  const { mutate: login } = useLoginMutation();

  const onSubmit = (data: LoginRequestDto) => {
    login(data, {
      onSuccess: (response) => {
        reset();
        if (onSuccess) {
          onSuccess(response);
        } else {
          Alert.alert("Login Successful", JSON.stringify(response));
        }
      },
      onError: (error) => {
        Alert.alert("Login Failed", error.message);
      },
    });
  };

  return (
    <View className="w-full">
      <InputField
        control={control}
        name="email"
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <InputField
        ref={passwordRef}
        control={control}
        name="password"
        label="Password"
        placeholder="Enter your password"
        isPassword
        autoComplete="current-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit(onSubmit)}
        keyboardType="number-pad"
        maxLength={MAX_PASSWORD_LENGTH}
      />

      <ButtonAtom
        title="Log In"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        className="mt-4"
      />
    </View>
  );
};
