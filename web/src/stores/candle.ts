import { defineStore } from "pinia";
import type { CandleView } from "./types.js";

export const useCandleStore = defineStore("candle", {
  state: () => ({ candles: [] as CandleView[] }),
  actions: {
    setInitial(list: CandleView[]) {
      this.candles = [...list].sort((a, b) => a.timestamp - b.timestamp);
    },
    applyCandle(candle: CandleView) {
      const last = this.candles[this.candles.length - 1];
      if (last && last.timestamp === candle.timestamp) {
        this.candles.splice(this.candles.length - 1, 1, candle);
      } else {
        this.candles.push(candle);
      }
    },
  },
});
