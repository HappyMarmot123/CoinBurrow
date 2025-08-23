"use client";

import Script from "next/script";
import { useMarketConnection } from "@/features/market/hooks/useMarketConnection";
import { MarketList } from "@/features/market/ui/MarketList";
import WidgetTemplate from "@/shared/components/WidgetTemplate";

export const MarketWidget = () => {
  useMarketConnection();

  return (
    <WidgetTemplate>
      <Script
        src="https://cdn.socket.io/4.7.5/socket.io.min.js"
        strategy="afterInteractive"
      />
      <MarketList />
    </WidgetTemplate>
  );
};
