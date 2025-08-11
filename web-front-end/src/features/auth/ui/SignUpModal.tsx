"use client";

import { useModal } from "@/shared/contexts/ModalContext";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  username: z.string().min(1, { message: "Username is required." }),
  password: z
    .string()
    .length(6, { message: "비밀번호는 6자리여야 합니다." })
    .regex(/^\d+$/, {
      message: "비밀번호는 숫자만 입력 가능합니다.",
    }),
});

type SignUpFormInputs = z.infer<typeof signUpSchema>;

export const SignUpModal = () => {
  const { closeModal } = useModal();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SignUpFormInputs>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
  });

  const handleClear = (fieldName: keyof SignUpFormInputs) => {
    setValue(fieldName, "");
  };

  const values = watch();

  const onSubmit = async (data: SignUpFormInputs) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      console.log("Successfully signed up:", result);
      alert("Sign up successful!");
      closeModal();
    } catch (error) {
      if (error instanceof Error) {
        console.error("Sign up failed:", error.message);
        alert(`Sign up failed: ${error.message}`);
      } else {
        console.error("An unexpected error occurred:", error);
        alert("An unexpected error occurred.");
      }
    }
  };

  return (
    <section
      aria-label="Sign up modal"
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[100]"
    >
      <div className="bg-white p-8 rounded-lg w-full max-w-md">
        <h2 className="text-4xl font-extrabold mb-2 text-center text-gray-900">
          Sign Up
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Welcome! Create an account to get started
        </p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField<SignUpFormInputs>
            label="Email"
            name="email"
            type="email"
            register={register}
            error={errors.email}
            placeholder="Enter your email"
            onClear={handleClear}
            value={values.email}
            required
          />
          <FormField<SignUpFormInputs>
            label="Username"
            name="username"
            type="text"
            register={register}
            error={errors.username}
            placeholder="Choose a username"
            onClear={handleClear}
            value={values.username}
            required
          />
          <FormField<SignUpFormInputs>
            label="Password"
            name="password"
            type="password"
            register={register}
            error={errors.password}
            placeholder="6-digit numeric password"
            onClear={handleClear}
            value={values.password}
            isPassword
            required
          />
          <div className="flex items-center justify-between mt-8 gap-4">
            <Button
              type="button"
              onClick={closeModal}
              className="flex-1/2"
              variant="secondary"
              size="large"
            >
              Close
            </Button>
            <Button
              type="submit"
              className="flex-1/2"
              variant="primaryGreen"
              size="large"
            >
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};
