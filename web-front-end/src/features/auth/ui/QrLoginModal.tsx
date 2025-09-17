"use client";

import { ModalLayout } from "@/shared/ui/ModalLayout";
import { QrForm } from "@/features/auth/components/QrForm";
import { useModal } from "@/shared/contexts/ModalContext";
import { useQrModal } from "../hooks/useQrModal";

const QrLoginContent = () => {
  const { closeModal } = useModal();
  const { sessionToken } = useQrModal(); // ✅ useSuspenseQuery

  return (
    <QrForm
      sessionToken={sessionToken as string}
      onClose={() => closeModal("qrForm")}
    />
  );
};

export const QrLoginModal = () => {
  return (
    <ModalLayout>
      <QrLoginContent />
    </ModalLayout>
  );
};
