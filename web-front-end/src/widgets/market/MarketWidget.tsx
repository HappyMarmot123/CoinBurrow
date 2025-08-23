"use client";

import Script from "next/script";
import { useMarketConnection } from "@/features/market/hooks/useMarketConnection";
import { MarketList } from "@/features/market/ui/MarketList";

export const MarketWidget = () => {
  useMarketConnection();

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <Script
        src="https://cdn.socket.io/4.7.5/socket.io.min.js"
        strategy="afterInteractive"
      />
      <MarketList />
    </div>
  );
};
