import { useEffect, useRef } from "react";
import io from "socket.io-client";
import { useMarketStore } from "../../../app/store/useMarketStore";
import { Ticker } from "../../../entities/market/types/types";

declare global {
  interface Window {
    io: typeof io;
  }
}

export const useMarketConnection = () => {
  const { setMarkets, updateTicker, setError } = useMarketStore();
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    async function fetchInitialMarkets() {
      try {
        const response = await fetch(`/api/market/all`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const initialMarkets = await response.json();
        setMarkets(initialMarkets);
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "An unknown error occurred.";
        setError(`데이터를 불러오는 데 실패했습니다: ${errorMessage}`);
      }
    }

    function connectWebSocket() {
      if (!BACKEND_URL) {
        setError("백엔드 URL이 설정되지 않았습니다.");
        return;
      }

      const socket = window.io(`${BACKEND_URL}/market`, {
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("WebSocket connected successfully:", socket.id);
      });

      socket.on("ticker", (tickerData: Ticker) => {
        updateTicker(tickerData);
      });

      socket.on("disconnect", () => {
        console.log("WebSocket disconnected.");
      });

      socket.on("connect_error", (err: Error) => {
        console.error("WebSocket connection error:", err);
        setError("실시간 데이터 연결에 실패했습니다.");
      });

      socketRef.current = socket;
    }

    fetchInitialMarkets();
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [setMarkets, updateTicker, setError]);
};
