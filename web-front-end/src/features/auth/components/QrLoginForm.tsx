"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import io from "socket.io-client";
import { Button } from "@/shared/components/Button";

type QrLoginFormProps = {
  sessionToken: string;
  onClose: () => void;
};

const EXPIRATION_TIME_IN_SECONDS = 300;

export const QrLoginForm = ({ sessionToken, onClose }: QrLoginFormProps) => {
  const [timeLeft, setTimeLeft] = useState(EXPIRATION_TIME_IN_SECONDS);
  const router = useRouter();

  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/auth`, {
      query: { sessionToken },
      transports: ["websocket"],
    });

    socket.on("connect", () => console.log("WebSocket connected"));

    socket.on("qr-login-success", (data: { accessToken: string }) => {
      const { accessToken } = data;
      Cookies.set("accessToken", accessToken, { expires: 1 });
      onClose();
      router.push("/market");
    });

    socket.on("disconnect", () => console.log("WebSocket disconnected"));

    return () => {
      socket.disconnect();
    };
  }, [sessionToken, router, onClose]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

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
