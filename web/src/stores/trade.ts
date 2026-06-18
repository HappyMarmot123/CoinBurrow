import { defineStore } from "pinia";
import type { TradeView } from "./types.js";

export const useTradeStore = defineStore("trade", {
  state: () => ({ recent: [] as TradeView[] }),
  actions: {
    applyTrade(trade: TradeView) {
      this.recent.unshift(trade);
      if (this.recent.length > 50) {
        this.recent.length = 50;
      }
    },
  },
});
