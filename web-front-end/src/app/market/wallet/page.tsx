"use client";

import { useCoinListStore } from "@/app/store/useCoinListStore";

const WalletPage = () => {
  const coinList = useCoinListStore((state) => state.coinList);

  return (
    <div>
      <h1>Coin List</h1>
      <ul>
        {coinList.map((coin) => (
          <li key={coin.market}>
            {coin.korean_name} ({coin.market})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WalletPage;
