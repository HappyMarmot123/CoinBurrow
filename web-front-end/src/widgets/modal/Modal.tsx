"use client";

import { Suspense } from "react";
import { SignUpModal } from "@/features/auth/ui/SignUpModal";
import { QrLoginModal } from "@/features/auth/ui/QrLoginModal";
import { useModal } from "@/shared/contexts/ModalContext";
import { ModalLayout } from "@/shared/ui/ModalLayout";

const LoadingFallback = () => (
  <ModalLayout>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-white"></div>
  </ModalLayout>
);

export const Modal = () => {
  const { isModalOpen } = useModal();

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        {isModalOpen("signup") && <SignUpModal />}
        {isModalOpen("qrForm") && <QrLoginModal />}
      </Suspense>
    </>
  );
};
