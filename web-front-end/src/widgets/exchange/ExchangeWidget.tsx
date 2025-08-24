"use client";

import { useEffect } from "react";
import { useExchangeSocketWorker } from "@/features/exchange/hooks/useExchangeSocketWorker";
import { ExchangeList } from "@/features/exchange/ui/ExchangeList";
import WidgetTemplate from "@/shared/components/WidgetTemplate";
import { useExchangeStore } from "@/app/store/useExchangeStore";

export const ExchangeWidget = () => {
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

  useEffect(() => {
    connect(); // Call connect without URL argument
  }, [connect]);

  useEffect(() => {
    if (isConnected) {
      const markets = ["KRW-BTC"];
      markets.forEach((market) => {
        subscribeOrderbook(market);
        subscribeCandle(market);
      });
      subscribeTicker();
    }

    return () => {
      if (isConnected) {
        const markets = ["KRW-BTC"];
        markets.forEach((market) => {
          unsubscribeOrderbook(market);
          unsubscribeCandle(market);
        });
        unsubscribeTicker();
      }
    };
  }, [
    isConnected,
    subscribeOrderbook,
    unsubscribeOrderbook,
    subscribeCandle,
    unsubscribeCandle,
    subscribeTicker,
    unsubscribeTicker,
  ]);

  return (
    <WidgetTemplate>
      <p>Market Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <ExchangeList />
    </WidgetTemplate>
  );
};
