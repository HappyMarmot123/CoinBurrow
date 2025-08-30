import { useEffect, useRef, useCallback } from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import {
  WorkerCommand,
  WorkerResponse,
  SocketNamespace,
} from "@/shared/types/socket"; // SocketNamespace import 추가

export function useExchangeSocketWorker() {
  const worker = useRef<Worker | null>(null);
  const {
    setConnected,
    updateTickerData,
    updateCandleData,
    updateOrderbookData,
    updateMarketData,
  } = useExchangeStore((state) => state.actions);

  useEffect(() => {
    const workerInstance = new Worker(
      new URL("@/shared/workers/socket.worker.ts", import.meta.url)
    );
    worker.current = workerInstance;

    workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data; // payload 구조 분해 할당
      switch (type) {
        case "CONNECTED":
          setConnected(true);
          break;
        case "DISCONNECTED":
          setConnected(false);
          break;
        case "TICKER_UPDATE": {
          updateTickerData(payload.data);
          break;
        }
        case "ORDERBOOK_UPDATE": {
          updateOrderbookData(payload.data);
          break;
        }
        case "CANDLE_UPDATE": {
          updateCandleData(payload.data);
          break;
        }
        case "MARKET_DATA_UPDATE": {
          updateMarketData(payload.data);
          break;
        }
        case "ERROR": {
          console.error("Socket Worker Error:", payload.message);
          break;
        }
      }
    };

    return () => {
      workerInstance.postMessage({
        type: "DISCONNECT",
        payload: { namespace: "/exchange" },
      } as WorkerCommand);
      workerInstance.terminate();
    };
  }, [
    setConnected,
    updateTickerData,
    updateCandleData,
    updateOrderbookData,
    updateMarketData,
  ]); // updateMarketData 의존성 추가

  // connect 함수 수정: namespace만 인자로 받도록 변경
  const connect = useCallback((namespace: SocketNamespace) => {
    worker.current?.postMessage({
      type: "CONNECT",
      payload: { namespace, url: process.env.NEXT_PUBLIC_WEBSOCKET_URL },
    } as WorkerCommand);
  }, []);

  const subscribeOrderbook = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_ORDERBOOK",
      payload: { namespace: "/exchange", market },
    } as WorkerCommand);
  }, []);

  const unsubscribeOrderbook = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_ORDERBOOK",
      payload: { namespace: "/exchange", market },
    } as WorkerCommand);
  }, []);

  const subscribeCandle = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_CANDLE",
      payload: { namespace: "/exchange", market },
    } as WorkerCommand);
  }, []);

  const unsubscribeCandle = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_CANDLE",
      payload: { namespace: "/exchange", market },
    } as WorkerCommand);
  }, []);

  const subscribeTicker = useCallback(() => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_TICKER",
      payload: { namespace: "/exchange" },
    } as WorkerCommand);
  }, []);

  const unsubscribeTicker = useCallback(() => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_TICKER",
      payload: { namespace: "/exchange" },
    } as WorkerCommand);
  }, []);

  const subscribeMarketData = useCallback(() => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_MARKET_DATA",
      payload: { namespace: "/market" },
    } as WorkerCommand);
  }, []);

  const unsubscribeMarketData = useCallback(() => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_MARKET_DATA",
      payload: { namespace: "/market" },
    } as WorkerCommand);
  }, []);

  return {
    connect,
    subscribeOrderbook,
    unsubscribeOrderbook,
    subscribeCandle,
    unsubscribeCandle,
    subscribeTicker,
    unsubscribeTicker,
    subscribeMarketData,
    unsubscribeMarketData,
  };
}
