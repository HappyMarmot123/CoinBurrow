import { defineStore } from "pinia";
import { getKimchiUniverse, type KimchiUniverseItemView } from "../api/rest.js";
import { useTickerStore } from "./ticker.js";
import { useBinanceStore } from "./binance.js";
import { useFxStore } from "./fx.js";

export interface KimchiRow {
  base: string;
  koreanName: string;
  upbitMarket: string;
  binanceSymbol: string;
  accTradePrice24h: number;
  upbitKrw: number | null;
  binanceKrw: number | null;
  premiumPercent: number | null;
}

export const useKimchiStore = defineStore("kimchi", {
  state: () => ({
    items: [] as KimchiUniverseItemView[],
    loading: false,
    error: "",
    degraded: false,
  }),
  getters: {
    upbitMarkets: (state): string[] => state.items.map((item) => item.upbitMarket),
    binanceSymbols: (state): string[] => state.items.map((item) => item.binanceSymbol),
    rows(state): KimchiRow[] {
      const ticker = useTickerStore();
      const binance = useBinanceStore();
      const fx = useFxStore();

      return state.items.map((item) => {
        const upbitKrw = ticker.byMarket[item.upbitMarket]?.tradePrice ?? null;
        const binanceUsdt = binance.bySymbol[item.binanceSymbol] ?? null;
        const krw = fx.krw;

        const binanceKrw = binanceUsdt !== null && krw !== null ? binanceUsdt * krw : null;
        const premiumPercent =
          upbitKrw !== null && binanceKrw !== null && binanceKrw > 0
            ? (upbitKrw / binanceKrw - 1) * 100
            : null;

        return {
          base: item.base,
          koreanName: item.koreanName,
          upbitMarket: item.upbitMarket,
          binanceSymbol: item.binanceSymbol,
          accTradePrice24h: item.accTradePrice24h,
          upbitKrw,
          binanceKrw,
          premiumPercent,
        };
      });
    },
  },
  actions: {
    async loadUniverse() {
      this.loading = true;
      try {
        const view = await getKimchiUniverse();
        this.items = view.items;
        this.degraded = view.degraded ?? false;
        this.error = "";
      } catch (error) {
        this.error = error instanceof Error ? error.message : "김프 목록을 불러오지 못했습니다.";
      } finally {
        this.loading = false;
      }
    },
  },
});
