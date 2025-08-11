"use client";

import { useModal } from "@/shared/contexts/ModalContext";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  username: z.string().min(1, { message: "Username is required." }),
  password: z
    .string()
    .length(6, { message: "Password must be 6 characters." })
    .regex(/^\d+$/, {
      message: "Password must contain only numbers.",
    }),
});

type SignUpFormInputs = z.infer<typeof signUpSchema>;

export const SignUpModal = () => {
  const { closeModal } = useModal();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
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

  const values = watch();

  const handleClear = (fieldName: keyof SignUpFormInputs) => {
    setValue(fieldName, "");
  };

  const onSubmit = async (data: SignUpFormInputs) => {
    setSubmissionError(null);
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
        throw new Error(result.message);
      }

      toast.success("Sign up successful!");
      closeModal();
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(errorMessage);
      setSubmissionError(errorMessage);
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
            maxLength={6}
            onClear={handleClear}
            value={values.password}
            isPassword
            required
          />
          {submissionError && (
            <p className="text-red-500 text-sm text-center">
              {submissionError}
            </p>
          )}
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
