"use client";

import { MarketState, useMarketStore } from "@/app/store/useMarketStore";
import { TickerRow } from "@/features/market/components/TickerRow";
import { useStore } from "zustand";

export const MarketList = () => {
  const markets = useStore(
    useMarketStore,
    (state: MarketState) => state.markets
  );
  const tickers = useStore(
    useMarketStore,
    (state: MarketState) => state.tickers
  );
  const isLoading = useStore(
    useMarketStore,
    (state: MarketState) => state.isLoading
  );
  const error = useStore(useMarketStore, (state: MarketState) => state.error);

  return (
    <>
      <h1 className="text-2xl font-bold text-green-400 mb-4">실시간 시세</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-3 text-left">한글명</th>
              <th className="p-3 text-left">현재가</th>
              <th className="p-3 text-left">전일대비</th>
              <th className="p-3 text-left">24시간 거래대금</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-4">
                  데이터를 불러오는 중입니다...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-red-500">
                  {error}
                </td>
              </tr>
            ) : (
              markets.map((market) => (
                <TickerRow
                  key={market.market}
                  market={market}
                  ticker={tickers[market.market]}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
