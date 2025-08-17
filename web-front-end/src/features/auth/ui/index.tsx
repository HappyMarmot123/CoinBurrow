"use client";

import { SignUpModal } from "@/features/auth/ui/SignUpModal";
import { QrLoginModal } from "@/features/auth/ui/QrLoginModal";
import { useModal } from "@/shared/contexts/ModalContext";

export const Modal = () => {
  const { isModalOpen } = useModal();

  return (
    <>
      {isModalOpen("signup") && <SignUpModal />}
      {isModalOpen("qrForm") && <QrLoginModal />}
    </>
  );
};
