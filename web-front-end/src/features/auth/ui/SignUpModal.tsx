"use client";

import { useModal } from "@/shared/contexts/ModalContext";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { SignUpFormView } from "@/features/auth/components/SignUpFormView";
import { SignUpSuccessView } from "@/features/auth/components/SignUpSuccessView";
import { ModalLayout } from "@/shared/ui/ModalLayout";

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

export type SignUpFormInputs = z.infer<typeof signUpSchema>;

export const SignUpModal = () => {
  const { closeModal } = useModal();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
      setIsSubmitted(true);
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(errorMessage);
      setSubmissionError(errorMessage);
    }
  };

  return (
    <ModalLayout>
      <div className="bg-white p-8 rounded-lg w-full max-w-md">
        {isSubmitted ? (
          <SignUpSuccessView closeModal={() => closeModal("signup")} />
        ) : (
          <SignUpFormView
            onSubmit={handleSubmit(onSubmit)}
            register={register}
            errors={errors}
            handleClear={handleClear}
            values={values}
            submissionError={submissionError}
            closeModal={() => closeModal("signup")}
          />
        )}
      </div>
    </ModalLayout>
  );
};
