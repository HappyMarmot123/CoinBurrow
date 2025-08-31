import { useEffect } from "react";
import { useExchangeSocketWorker } from "./useExchangeSocketWorker";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { useShallow } from "zustand/react/shallow";

export const useExchangeConnection = () => {
  const {
    connect,
    subscribeOrderbook,
    unsubscribeOrderbook,
    subscribeCandle,
    unsubscribeCandle,
    subscribeTicker,
    unsubscribeTicker,
  } = useExchangeSocketWorker();
  const isConnected = useExchangeStore((state) => state.isConnected);
  const selectedCoin = useExchangeStore(
    useShallow((state) => state.selectedCoin)
  );

  // TODO: Nest.JS 게이트웨이 웹소켓
  useEffect(() => {
    connect("/exchange");
  }, [connect]);

  useEffect(() => {
    if (isConnected && selectedCoin) {
      subscribeTicker();
      subscribeOrderbook([selectedCoin.market]);
      subscribeCandle([selectedCoin.market]);
    }

    return () => {
      if (isConnected && selectedCoin) {
        unsubscribeTicker();
        unsubscribeOrderbook([selectedCoin.market]);
        unsubscribeCandle([selectedCoin.market]);
      }
    };
  }, [
    isConnected,
    selectedCoin,
    subscribeOrderbook,
    unsubscribeOrderbook,
    subscribeCandle,
    unsubscribeCandle,
    subscribeTicker,
    unsubscribeTicker,
  ]);
};
