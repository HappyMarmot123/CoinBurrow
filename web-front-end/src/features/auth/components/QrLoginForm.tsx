"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import Cookies from "js-cookie";

type QrLoginFormProps = {
  sessionToken: string;
  onClose: () => void;
};

const EXPIRATION_TIME_IN_SECONDS = 300; // 5분

export const QrLoginForm = ({ sessionToken, onClose }: QrLoginFormProps) => {
  const [qrValue, setQrValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(EXPIRATION_TIME_IN_SECONDS);
  const router = useRouter();

  useEffect(() => {
    if (sessionToken) {
      setQrValue(sessionToken);
      setTimeLeft(EXPIRATION_TIME_IN_SECONDS);

      const socket = io("ws://localhost:4000/auth", {
        query: { sessionToken },
      });

      socket.on("connect", () => {
        console.log("WebSocket connected");
      });

      socket.on("qr-login-success", (data) => {
        const { accessToken } = data;
        console.log("Received accessToken:", accessToken);
        Cookies.set("accessToken", accessToken, { expires: 1 });
        onClose();
        router.push("/exchange");
      });

      socket.on("disconnect", () => {
        console.log("WebSocket disconnected");
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [sessionToken, router, onClose]);

  useEffect(() => {
    if (!qrValue) return;

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
  }, [qrValue]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg">
      <div className="flex items-center justify-center">
        {qrValue && <QRCodeSVG value={qrValue} size={160} />}
      </div>
      <div className="flex flex-col justify-center items-center mt-8">
        {timeLeft > 0 ? (
          <>
            <p className="text-lg font-medium text-red-500">
              유효 시간: {formatTime(timeLeft)}
            </p>
            <p className="mt-2 text-gray-600 text-center">
              모바일 앱으로 QR 코드를 스캔하세요.
            </p>
          </>
        ) : (
          <p className="text-gray-600 text-center">
            유효기간이 만료되었습니다.
          </p>
        )}
      </div>
    </div>
  );
};
