"use client";

import { memo } from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { useShallow } from "zustand/react/shallow"; // useShallow import

interface TickerItemProps {
  market: string;
}

export const TickerItem = memo(({ market }: TickerItemProps) => {
  const ticker = useExchangeStore((state) => state.tickerData[market]);

  if (!ticker) {
    return <li>{market}: Loading...</li>;
  }

  return (
    <li key={market}>
      {ticker.korean_name} ({ticker.market}):{" "}
      {ticker.trade_price.toLocaleString()}
      <span
        style={{
          color:
            ticker.change === "RISE"
              ? "#ef4444"
              : ticker.change === "FALL"
              ? "#3b82f6"
              : "#9ca3af",
        }}
      >
        ({ticker.change_rate > 0 ? "+" : ""}
        {(ticker.change_rate * 100).toFixed(2)}%)
      </span>
    </li>
  );
});

TickerItem.displayName = "TickerItem";

export const ExchangeList = () => {
  const markets: string[] = useExchangeStore(
    useShallow((state) => Array.from(Object.keys(state.tickerData)))
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Exchange List</h2>
      <ul>
        {markets.length === 0 ? (
          <li>No market data available.</li>
        ) : (
          markets.map((market: string) => (
            <TickerItem key={market} market={market} />
          ))
        )}
      </ul>
    </div>
  );
};
