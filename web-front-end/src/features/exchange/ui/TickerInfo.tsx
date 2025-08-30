import React from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { formatPrice, formatSignedChangeRate } from "@/shared/utils/Formatter";
import { useShallow } from "zustand/react/shallow";
import Image from "next/image"; // Import Image component

export const TickerInfo = () => {
  const selectedCoin = useExchangeStore(
    useShallow((state) => state.selectedCoin)
  );
  const tickerData = useExchangeStore(useShallow((state) => state.tickerData));
  if (!selectedCoin) {
    return <div>코인을 선택해주세요.</div>;
  }

  const ticker = tickerData[selectedCoin.market];

  if (!ticker) {
    return <div>선택된 코인의 티커 정보를 불러오는 중입니다...</div>;
  }

  const { displayRate, colorClass } = formatSignedChangeRate(
    ticker.signed_change_rate
  );
  const displaySignedChangePrice = formatPrice(ticker.signed_change_price);

  return (
    <div className="grid grid-cols-7 gap-4 min-w-[500px] bg-gray-800 text-white p-4 rounded-lg shadow-md ">
      {/* Left Area (60%) */}
      <article className="ml-2 col-span-3 space-y-2 flex flex-col justify-between">
        {/* Left Area Top: selectCoin, 코인이미지 */}
        <div className="flex items-center gap-4">
          <Image
            src={`/coin/${selectedCoin.market
              .toLowerCase()
              .replace("krw-", "")}.png`}
            alt={selectedCoin.korean_name}
            width={24}
            height={24}
            className="rounded-full"
          />
          <p className="text-xl font-bold">
            {selectedCoin.korean_name} (
            {selectedCoin.market.replace("KRW-", "")})
          </p>
        </div>

        {/* Left Area Bottom: trade_price, displayRate, signed_change_price */}
        <div className="flex items-baseline">
          <span className="text-3xl font-extrabold mr-2">
            {formatPrice(ticker.trade_price)}
          </span>
          <span className="text-2xl font-semibold">KRW</span>
        </div>
        <div className="flex items-baseline gap-3">
          <p className={`${colorClass} text-xl font-bold`}>{displayRate}</p>
          <p className={`${colorClass} text-xl font-medium`}>
            {displaySignedChangePrice} KRW
          </p>
        </div>
      </article>

      <article className="col-span-4 grid grid-cols-2 text-sm text-gray-400 rounded-md">
        <div className="grid grid-cols-3 items-center">
          <span>고가</span>
          <span className="text-red-500 font-medium text-lg">
            {formatPrice(ticker.high_price)}
          </span>
        </div>
        <div className="grid grid-cols-3 items-center">
          <span>저가</span>
          <span className="text-blue-500 font-medium text-lg">
            {formatPrice(ticker.low_price)}
          </span>
        </div>
        <div className="grid grid-cols-3 items-center">
          <span>거래량(24H)</span>
          <span className="text-white font-medium text-lg">
            {formatPrice(ticker.acc_trade_volume_24h)}
          </span>
        </div>
        <div className="grid grid-cols-3 items-center">
          <span>거래대금(24H)</span>
          <span className="text-white font-medium text-lg">
            {formatPrice(ticker.acc_trade_price_24h)}
          </span>
        </div>
      </article>
    </div>
  );
};
