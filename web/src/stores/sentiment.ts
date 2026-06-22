import { defineStore } from "pinia";
import { getMarketSentiment, type SentimentView } from "../api/rest.js";

export const useSentimentStore = defineStore("sentiment", {
  state: () => ({
    current: null as SentimentView | null,
    loading: false,
    error: "",
  }),
  actions: {
    async load(days = 30) {
      this.loading = true;
      try {
        this.current = await getMarketSentiment(days);
        this.error = "";
      } catch (error) {
        this.error =
          error instanceof Error ? error.message : "감성 데이터를 불러오지 못했습니다.";
      } finally {
        this.loading = false;
      }
    },
  },
});
