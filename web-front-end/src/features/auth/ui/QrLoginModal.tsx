"use client";

import { ModalLayout } from "@/shared/ui/ModalLayout";
import { QrLoginForm } from "@/features/auth/components/QrLoginForm";
import { useEffect, useState } from "react";
import { useModal } from "@/shared/contexts/ModalContext";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";

export const QrLoginModal = () => {
  const { closeModal } = useModal();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQrSessionToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/auth/qr-login", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch QR session token");
        }

        const data = await response.json();
        setSessionToken(data.sessionToken);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQrSessionToken();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="bg-white p-8 rounded-lg w-full max-w-md text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">QR Code Loading...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white p-8 rounded-lg w-full max-w-md text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      );
    }

    if (sessionToken) {
      return (
        <QrLoginForm
          sessionToken={sessionToken}
          onClose={() => closeModal("qrForm")}
        />
      );
    }

    return null;
  };

  return <ModalLayout>{renderContent()}</ModalLayout>;
};
