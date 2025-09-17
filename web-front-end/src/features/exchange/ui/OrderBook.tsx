import React from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { useShallow } from "zustand/react/shallow";

export const OrderBook = () => {
  const selectedCoin = useExchangeStore(
    useShallow((state) => state.selectedCoin)
  );

  return (
    <div>
      <p>
        OrderBook Component for{" "}
        {selectedCoin ? selectedCoin.korean_name : "No coin selected"}
      </p>
    </div>
  );
};
