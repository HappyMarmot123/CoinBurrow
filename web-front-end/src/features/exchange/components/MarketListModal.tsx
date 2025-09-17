import { ModalLayout } from "@/shared/ui/ModalLayout";
import { ModalName, useModal } from "@/shared/contexts/ModalContext";
import { useCoinListStore } from "@/app/store/useCoinListStore";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { useShallow } from "zustand/react/shallow";
import {
  formatSignedChangeRate,
  formatTradePrice,
} from "@/shared/utils/Formatter"; // Formatter import
import Image from "next/image"; // Image import
import { Market } from "@/entities/market/types/types";
import { Button } from "@/shared/components/Button";
import { memo } from "react";

export const MarketListModal = () => {
  return (
    <ModalLayout>
      <section className="bg-gray-700 p-8 rounded-lg w-[800px] h-[600px] grid grid-rows-[1fr]">
        <MarketListModalContent />
      </section>
    </ModalLayout>
  );
};

const MarketListModalContent = () => {
  const { closeModal } = useModal();
  const coinList = useCoinListStore(useShallow((state) => state.coinList));

  if (coinList.length === 0) {
    return (
      <div className="flex-grow grid place-items-center">
        <p className="text-gray-400 text-center text-lg">
          코인 목록을 불러오는 중입니다...
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        거래 가능한 코인
      </h2>
      <div className="flex-grow overflow-y-auto pr-2">
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coinList.map((coin) => {
            return (
              <ListItem key={coin.market} coin={coin} closeModal={closeModal} />
            );
          })}
        </ul>
      </div>
      <Button
        variant="primaryGreen"
        size="medium"
        className="mt-4"
        onClick={() => closeModal("marketList")}
      >
        닫기
      </Button>
    </>
  );
};

const ListItem = memo(
  ({
    coin,
    closeModal,
  }: {
    coin: Market;
    closeModal: (modalName: ModalName) => void;
  }) => {
    const { setSelectedCoin } = useExchangeStore(
      useShallow((state) => state.actions)
    );
    const tickerData = useExchangeStore(
      useShallow((state) => state.tickerData)
    );

    const formatCoinListData = (coin: Market) => {
      const ticker = tickerData[coin.market];
      const { displayRate, colorClass } = formatSignedChangeRate(
        ticker?.signed_change_rate
      );
      const displayTradePrice = formatTradePrice(ticker?.trade_price);

      return {
        displayRate,
        colorClass,
        displayTradePrice,
      };
    };

    const { displayRate, colorClass, displayTradePrice } =
      formatCoinListData(coin);

    return (
      <li
        key={coin.market}
        className="flex items-center justify-between bg-gray-800 p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-600 transition-colors duration-200"
        onClick={() => {
          setSelectedCoin(coin);
          closeModal("marketList");
        }}
      >
        <article className="flex items-center space-x-4">
          <Image
            src={`/coin/${coin.market.toLowerCase().replace("krw-", "")}.png`}
            alt={coin.korean_name}
            width={32}
            height={32}
            className="rounded-full"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            onError={(e) => {
              e.currentTarget.src = "/file.svg"; // Fallback image
            }}
          />
          <span className="text-white text-lg font-semibold">
            {coin.korean_name}{" "}
            <span className="text-gray-400 text-sm">
              {coin.market.replace("KRW-", "")}
            </span>
          </span>
        </article>
        <article className="flex flex-col items-end">
          <span className="text-xl font-bold text-white">
            {displayTradePrice} KRW
          </span>
          <span className={`${colorClass} text-lg font-medium`}>
            {displayRate}
          </span>
        </article>
      </li>
    );
  }
);

ListItem.displayName = "ListItem";
