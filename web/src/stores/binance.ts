import { defineStore } from "pinia";
import type { BinancePriceUpdate } from "../workers/binanceProtocol.js";

export const useBinanceStore = defineStore("binance", {
  state: () => ({ bySymbol: {} as Record<string, number> }),
  actions: {
    applyPrices(list: BinancePriceUpdate[]) {
      list.forEach((update) => {
        this.bySymbol[update.symbol] = update.price;
      });
    },
  },
});
