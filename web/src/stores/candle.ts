import { defineStore } from "pinia";
import type { CandleView } from "./types.js";

export const useCandleStore = defineStore("candle", {
  state: () => ({ candles: [] as CandleView[] }),
  actions: {
    setInitial(list: CandleView[]) {
      this.candles = [...list].sort((a, b) => a.timestamp - b.timestamp);
    },
    applyCandle(candle: CandleView) {
      if (this.candles.length === 0) {
        this.candles.push(candle);
        return;
      }

      const sameTimestampIndex = this.candles.findIndex((item) => item.timestamp === candle.timestamp);
      if (sameTimestampIndex >= 0) {
        this.candles.splice(sameTimestampIndex, 1, candle);
        return;
      }

      let insertAt = this.candles.length;
      while (insertAt > 0 && this.candles[insertAt - 1].timestamp > candle.timestamp) {
        insertAt--;
      }

      if (insertAt === this.candles.length) {
        this.candles.push(candle);
      } else if (insertAt === 0) {
        this.candles.unshift(candle);
      } else {
        this.candles.splice(insertAt, 0, candle);
      }
    },
  },
});
