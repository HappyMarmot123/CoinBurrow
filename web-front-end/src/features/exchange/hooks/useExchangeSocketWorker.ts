import { useEffect, useRef, useCallback } from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import {
  WorkerCommand,
  WorkerResponse,
  SocketNamespace,
} from "@/shared/types/socket";

export function useExchangeSocketWorker() {
  const worker = useRef<Worker | null>(null);
  const {
    setConnected,
    updateTickerData,
    updateCandleData,
    updateOrderbookData,
    updateTradeData, // updateTradeData 추가
    updateMarketData,
  } = useExchangeStore((state) => state.actions);

  useEffect(() => {
    const workerInstance = new Worker(
      new URL("@/shared/workers/socket.worker.ts", import.meta.url)
    );
    worker.current = workerInstance;

    workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;
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
          console.log("CANDLE_UPDATE", payload.data);
          updateCandleData(payload.data);
          break;
        }
        case "TRADE_UPDATE": {
          // TRADE_TICKS_UPDATE 추가
          updateTradeData(payload.data);
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
    updateTradeData, // updateTradeData 의존성 추가
    updateMarketData,
  ]);

  const connect = useCallback((namespace: SocketNamespace) => {
    worker.current?.postMessage({
      type: "CONNECT",
      payload: { namespace, url: process.env.NEXT_PUBLIC_WEBSOCKET_URL },
    } as WorkerCommand);
  }, []);

  const subscribeOrderbook = useCallback((markets: string[]) => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_ORDERBOOK",
      payload: { namespace: "/exchange", markets },
    } as WorkerCommand);
  }, []);

  const unsubscribeOrderbook = useCallback((markets: string[]) => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_ORDERBOOK",
      payload: { namespace: "/exchange", markets },
    } as WorkerCommand);
  }, []);

  const subscribeCandle = useCallback((markets: string[]) => {
    worker.current?.postMessage({
      type: "SUBSCRIBE_CANDLE",
      payload: { namespace: "/exchange", markets },
    } as WorkerCommand);
  }, []);

  const unsubscribeCandle = useCallback((markets: string[]) => {
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_CANDLE",
      payload: { namespace: "/exchange", markets },
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

  const subscribeTrade = useCallback((markets: string[]) => {
    // subscribeTrade 추가
    worker.current?.postMessage({
      type: "SUBSCRIBE_TRADE",
      payload: { namespace: "/exchange", markets },
    } as WorkerCommand);
  }, []);

  const unsubscribeTrade = useCallback((markets: string[]) => {
    // unsubscribeTrade 추가
    worker.current?.postMessage({
      type: "UNSUBSCRIBE_TRADE",
      payload: { namespace: "/exchange", markets },
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
    subscribeTrade, // subscribeTrade 추가
    unsubscribeTrade, // unsubscribeTrade 추가
    subscribeMarketData,
    unsubscribeMarketData,
  };
}
