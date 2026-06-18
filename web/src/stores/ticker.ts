import { defineStore } from "pinia";
import type { TickerView } from "./types.js";

export const useTickerStore = defineStore("ticker", {
  state: () => ({ byMarket: {} as Record<string, TickerView> }),
  actions: {
    applyTicker(list: TickerView[]) {
      list.forEach((ticker) => {
        this.byMarket[ticker.market] = ticker;
      });
    },
  },
});
