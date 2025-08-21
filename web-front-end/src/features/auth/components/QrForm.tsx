"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/shared/components/Button";
import { useQrForm } from "../hooks/useQrForm";

type QrFormProps = {
  sessionToken: string;
  onClose: () => void;
};

export const QrForm = ({ sessionToken, onClose }: QrFormProps) => {
  const { timeLeft, formatTime } = useQrForm({ sessionToken, onClose });

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg w-full max-w-md">
      <div className="flex items-center justify-center h-40 w-40">
        <QRCodeSVG value={sessionToken} size={160} />
      </div>
      <div className="flex flex-col justify-center items-center mt-8 text-center">
        {timeLeft > 0 ? (
          <>
            <p className="text-lg font-medium text-red-500">
              유효 시간: {formatTime(timeLeft)}
            </p>
            <p className="mt-2 text-gray-600">
              모바일 앱으로 QR 코드를 스캔하세요.
            </p>
          </>
        ) : (
          <p className="text-gray-600">유효기간이 만료되었습니다.</p>
        )}
      </div>
      <Button
        type="button"
        onClick={onClose}
        className="w-full mt-8"
        variant="secondary"
        size="large"
      >
        닫기
      </Button>
    </div>
  );
};
