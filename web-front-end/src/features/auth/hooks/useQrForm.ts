import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import io from "socket.io-client";

const EXPIRATION_TIME_IN_SECONDS = 300;

interface UseQrFormParams {
  sessionToken: string;
  onClose: () => void;
}

export const useQrForm = ({ sessionToken, onClose }: UseQrFormParams) => {
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

  return { timeLeft, formatTime };
};
