import { computed, ref, watch, type Ref } from "vue";

import type { BithumbKlineView } from "../api/rest.js";
import { getBithumbKlines } from "../api/rest.js";

function normalizeSymbolForBithumb(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  if (trimmed.includes("-")) {
    const [quote, base] = trimmed.split("-");
    if (!quote || !base || quote !== "KRW") return null;
    return `${base}/KRW`;
  }

  if (trimmed.includes("/")) {
    const [base, quote] = trimmed.split("/");
    if (!base || !quote || quote !== "KRW") return null;
    return `${base}/KRW`;
  }

  return null;
}

function pickLatest(values: BithumbKlineView[]): BithumbKlineView | null {
  if (!values.length) return null;
  const withTimestamp = values.filter((entry) => typeof entry.ts === "number");
  if (!withTimestamp.length) return values.at(-1) ?? null;

  return [...withTimestamp].sort((a, b) => b.ts - a.ts)[0] ?? null;
}

export interface BithumbKlineState {
  kline: Ref<BithumbKlineView | null>;
  loading: Ref<boolean>;
  error: Ref<string>;
  isApplicable: Ref<boolean>;
  hasKline: ReturnType<typeof computed<boolean>>;
}

export function useBithumbKlines(selectedMarket: Ref<string>) {
  const kline = ref<BithumbKlineView | null>(null);
  const loading = ref(false);
  const error = ref("");
  const isApplicable = ref(false);
  let requestToken = 0;

  async function loadMarketKlines(nextMarket: string) {
    const normalized = normalizeSymbolForBithumb(nextMarket);
    const currentToken = ++requestToken;

    if (!normalized) {
      isApplicable.value = false;
      loading.value = false;
      error.value = "";
      kline.value = null;
      return;
    }

    isApplicable.value = true;
    loading.value = true;
    error.value = "";

    try {
      const payload = await getBithumbKlines(normalized, "1h", 30);
      if (currentToken !== requestToken) return;

      kline.value = pickLatest(payload) ?? null;
      if (!kline.value) {
        error.value = "Bithumb kline data is unavailable";
      }
    } catch (cause) {
      if (currentToken !== requestToken) return;
      error.value = cause instanceof Error ? cause.message : "failed to load Bithumb kline";
      kline.value = null;
    } finally {
      if (currentToken === requestToken) {
        loading.value = false;
      }
    }
  }

  watch(selectedMarket, (nextMarket) => {
    void loadMarketKlines(nextMarket);
  }, {
    immediate: true,
  });

  return {
    kline,
    loading,
    error,
    isApplicable,
    hasKline: computed(() => kline.value !== null),
  };
}
