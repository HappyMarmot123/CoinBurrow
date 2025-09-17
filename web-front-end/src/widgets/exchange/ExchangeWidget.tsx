"use client";

import WidgetTemplate from "@/shared/components/WidgetTemplate";
import { useExchangeConnection } from "@/features/exchange/hooks/useExchangeConnection";
import { CandleChart } from "@/features/exchange/ui/CandleChart";
import { OrderBook } from "@/features/exchange/ui/OrderBook";
import { TradeForm } from "@/features/exchange/ui/TradeForm";
import { SearchBar } from "@/features/exchange/ui/SearchBar";
import { TickerInfo } from "@/features/exchange/ui/TickerInfo";

export const ExchangeWidget = () => {
  useExchangeConnection();

  return (
    <WidgetTemplate>
      <div className="flex h-full gap-[18px] px-8">
        <div className="w-[950px] space-y-4">
          {/* 티커정보, 차트, 마켓오더 */}
          <TickerInfo />
          <CandleChart />
        </div>

        <div className="w-[400px] space-y-2 bg-gray-800 rounded-lg">
          {/* 서치바 - 마켓 코인리스트 모달, 트레이드 폼 */}
          <SearchBar />
          <TradeForm />
        </div>
      </div>
    </WidgetTemplate>
  );
};
