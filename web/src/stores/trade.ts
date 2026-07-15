import { defineStore } from "pinia";
import type { TradeView } from "./types.js";

export const useTradeStore = defineStore("trade", {
  state: () => ({
    recent: [] as TradeView[],
    latestBatch: [] as TradeView[],
  }),
  actions: {
    setInitial(trades: TradeView[]) {
      this.recent = [...trades].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
      this.latestBatch = [];
    },
    applyTrade(trade: TradeView) {
      this.applyTrades([trade]);
    },
    applyTrades(trades: TradeView[]) {
      const orderedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

      orderedTrades.forEach((trade) => {
        this.recent.unshift(trade);
      });
      if (this.recent.length > 50) {
        this.recent.length = 50;
      }
      this.latestBatch = orderedTrades;
    },
  },
});
