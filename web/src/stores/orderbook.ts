import { defineStore } from "pinia";
import type { OrderbookView } from "./types.js";

export const useOrderbookStore = defineStore("orderbook", {
  state: () => ({ current: null as OrderbookView | null }),
  actions: {
    applyOrderbook(orderbook: OrderbookView) {
      this.current = orderbook;
    },
  },
});
