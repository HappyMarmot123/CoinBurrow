import { defineStore } from "pinia";
import { getGlobalMarket, type GlobalMarketView } from "../api/rest.js";

export const useGlobalStore = defineStore("global", {
  state: () => ({
    current: null as GlobalMarketView | null,
    loading: false,
    error: "",
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        this.current = await getGlobalMarket();
        this.error = "";
      } catch (error) {
        this.error =
          error instanceof Error ? error.message : "글로벌 시장 데이터를 불러오지 못했습니다.";
      } finally {
        this.loading = false;
      }
    },
  },
});
