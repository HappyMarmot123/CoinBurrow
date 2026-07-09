import { defineStore } from "pinia";
import type { TickerView, TradeView } from "./types.js";

export const useTickerStore = defineStore("ticker", {
  state: () => ({ byMarket: {} as Record<string, TickerView> }),
  actions: {
    applyTicker(list: TickerView[]) {
      list.forEach((ticker) => {
        this.byMarket[ticker.market] = ticker;
      });
    },
    applyTradeTick(trade: TradeView) {
      const current = this.byMarket[trade.market];
      if (!current) return;

      const next: TickerView = {
        ...current,
        tradePrice: trade.price,
      };

      if (typeof current.openingPrice === "number" && current.openingPrice > 0) {
        next.signedChangeRate = (trade.price - current.openingPrice) / current.openingPrice;
      }
      if (typeof current.highPrice === "number") {
        next.highPrice = Math.max(current.highPrice, trade.price);
      }
      if (typeof current.lowPrice === "number") {
        next.lowPrice = Math.min(current.lowPrice, trade.price);
      }

      this.byMarket[trade.market] = next;
    },
  },
});
