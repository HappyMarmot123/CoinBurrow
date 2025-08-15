import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, TextInput, View } from "react-native";

import { LoginRequestDto, LoginResponseDto } from "@/app/core/dto/auth.dto";
import { useLoginMutation } from "@/app/core/hooks/useLoginMutation";
import { loginSchema } from "@/app/core/schemas/auth.schema";
import { ButtonAtom } from "../atoms/ButtonAtom";
import { Field } from "../molecules/Field";

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

  const { mutate: login } = useLoginMutation();

  const passwordRef = React.useRef<TextInput>(null);

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
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field
            label="Email"
            placeholder="Enter your email"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.email}
            returnKeyType="next"
            onSubmitEditing={() => {
              passwordRef.current?.focus();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field
            ref={passwordRef}
            label="Password"
            placeholder="Enter your password"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.password}
            isPassword
            returnKeyType="done"
            onSubmitEditing={handleSubmit(onSubmit)}
          />
        )}
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
