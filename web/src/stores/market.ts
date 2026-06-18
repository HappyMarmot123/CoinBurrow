import { defineStore } from "pinia";
import type { MarketView } from "./types.js";

export const useMarketStore = defineStore("market", {
  state: () => ({ list: [] as MarketView[] }),
  actions: {
    setList(list: MarketView[]) {
      this.list = list;
    },
  },
});
