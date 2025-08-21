"use client";

import { useModal } from "@/shared/contexts/ModalContext";
import React from "react";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { SignUpSuccess } from "@/features/auth/components/SignUpSuccess";
import { ModalLayout } from "@/shared/ui/ModalLayout";
import { useSignUpForm } from "../hooks/useSignUpForm";

export const SignUpModal = () => {
  const { closeModal } = useModal();
  const {
    isSubmitted,
    submissionError,
    register,
    handleSubmit,
    errors,
    values,
    handleClear,
  } = useSignUpForm();

  return (
    <ModalLayout>
      <div className="bg-white p-8 rounded-lg w-full max-w-md">
        {isSubmitted ? (
          <SignUpSuccess closeModal={() => closeModal("signup")} />
        ) : (
          <SignUpForm
            onSubmit={handleSubmit}
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
