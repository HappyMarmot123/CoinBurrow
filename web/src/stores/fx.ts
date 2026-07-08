import { defineStore } from "pinia";
import { getFx } from "../api/rest.js";

export const useFxStore = defineStore("fx", {
  state: () => ({
    krw: null as number | null,
    stale: false,
    degraded: false,
    loading: false,
    error: "",
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        const view = await getFx();
        this.krw = view.krw;
        this.stale = view.stale;
        this.degraded = view.degraded ?? false;
        this.error = "";
      } catch (error) {
        this.error = error instanceof Error ? error.message : "환율을 불러오지 못했습니다.";
      } finally {
        this.loading = false;
      }
    },
  },
});
