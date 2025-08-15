"use client";

import { ModalLayout } from "@/shared/ui/ModalLayout";
import { QrLoginForm } from "@/features/auth/components/QrLoginForm";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/Button";
import { useModal } from "@/shared/contexts/ModalContext";

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
        const response = await fetch(
          "http://localhost:3000/api/auth/qr-login",
          {
            method: "POST",
            cache: "no-store",
          }
        );

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

  return (
    <ModalLayout>
      <div className="bg-white p-8 rounded-lg w-full max-w-md">
        {loading && <p>Loading QR Code...</p>}
        {error && <p>Error: {error}. Please try again.</p>}
        {sessionToken && (
          <QrLoginForm
            sessionToken={sessionToken}
            onClose={() => closeModal("qrForm")}
          />
        )}
        <div>
          <Button
            type="button"
            onClick={() => closeModal("qrForm")}
            className="w-full"
            variant="secondary"
            size="large"
          >
            Close
          </Button>
        </div>
      </div>
    </ModalLayout>
  );
};
