import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, TextInput, View } from "react-native";
import { z } from "zod";
import { ButtonAtom } from "../atoms/ButtonAtom";
import { Field } from "../molecules/Field";

const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: (data: LoginFormValues) => void;
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const passwordRef = React.useRef<TextInput>(null);

  const onSubmit = (data: LoginFormValues) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(data);
        } else {
          Alert.alert("로그인 성공", JSON.stringify(data));
        }
        reset();
        resolve(true);
      }, 1000);
    });
  };

  return (
    <View className="w-full">
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field
            label="이메일"
            placeholder="이메일을 입력하세요"
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
            label="비밀번호"
            placeholder="비밀번호를 입력하세요"
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
        title="로그인"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        className="mt-4"
      />
    </View>
  );
};
