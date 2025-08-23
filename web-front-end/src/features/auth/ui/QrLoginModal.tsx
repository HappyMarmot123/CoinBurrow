"use client";

import { ModalLayout } from "@/shared/ui/ModalLayout";
import { QrForm } from "@/features/auth/components/QrForm";
import { useModal } from "@/shared/contexts/ModalContext";
import { useQrModal } from "../hooks/useQrModal";
import { Suspense } from "react";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";

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
      <Suspense
        fallback={
          <div className="bg-white p-8 rounded-lg w-full max-w-md text-center">
            <LoadingSpinner />
            <p className="text-gray-600 mt-4">QR Code Loading...</p>
          </div>
        }
      >
        <QrLoginContent />
      </Suspense>
    </ModalLayout>
  );
};
