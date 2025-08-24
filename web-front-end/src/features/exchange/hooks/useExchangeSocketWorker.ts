import { useEffect, useRef, useCallback } from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { WorkerCommand, WorkerResponse } from "@/shared/types/socket";

export function useExchangeSocketWorker() {
  const worker = useRef<Worker | null>(null);
  const {
    setConnected,
    updateTickerData,
    updateCandleData,
    updateOrderbookData,
  } = useExchangeStore((state) => state.actions);

  useEffect(() => {
    const workerInstance = new Worker(
      new URL("@/shared/workers/socket.worker.ts", import.meta.url)
    );
    worker.current = workerInstance;

    workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type } = event.data;
      switch (type) {
        case "CONNECTED":
          setConnected(true);
          break;
        case "DISCONNECTED":
          setConnected(false);
          break;
        case "TICKER_UPDATE": {
          const { payload } = event.data as Extract<
            WorkerResponse,
            { type: "TICKER_UPDATE" }
          >;
          updateTickerData(payload);
          break;
        }
        case "ORDERBOOK_UPDATE": {
          const { payload } = event.data as Extract<
            WorkerResponse,
            { type: "ORDERBOOK_UPDATE" }
          >;
          updateOrderbookData(payload);
          break;
        }
        case "CANDLE_UPDATE": {
          const { payload } = event.data as Extract<
            WorkerResponse,
            { type: "CANDLE_UPDATE" }
          >;
          updateCandleData(payload);
          break;
        }
        case "ERROR": {
          const { payload } = event.data as Extract<
            WorkerResponse,
            { type: "ERROR" }
          >;
          console.error("Socket Worker Error:", payload.message);
          break;
        }
      }
    };

    return () => {
      workerInstance.postMessage({ type: "DISCONNECT" } as WorkerCommand);
      workerInstance.terminate();
    };
  }, [setConnected, updateTickerData, updateCandleData, updateOrderbookData]);

  const connect = useCallback(() => {
    worker.current?.postMessage({
      type: "CONNECT",
    } as WorkerCommand);
  }, []);

  const subscribeOrderbook = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_ORDERBOOK",
      payload: { market },
    } as WorkerCommand);
  }, []);

  const unsubscribeOrderbook = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_ORDERBOOK",
      payload: { market },
    } as WorkerCommand);
  }, []);

  const subscribeCandle = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_CANDLE",
      payload: { market },
    } as WorkerCommand);
  }, []);

  const unsubscribeCandle = useCallback((market: string) => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_CANDLE",
      payload: { market },
    } as WorkerCommand);
  }, []);

  const subscribeTicker = useCallback(() => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_TICKER",
    } as WorkerCommand);
  }, []);

  const unsubscribeTicker = useCallback(() => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_TICKER",
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
  };
}
