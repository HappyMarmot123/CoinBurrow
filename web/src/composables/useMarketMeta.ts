import { computed, ref, type Ref } from "vue";
import {
  getAvailableQuotes,
  getExchangeRates,
  getMarketStatus,
  getMarketSummaries,
  type ExchangeRateView,
  type MarketStatusView,
  type MarketSummaryView,
} from "../api/rest.js";
import { CAUTION_LABELS } from "../constants/exchange.js";

export function useMarketMeta(selectedQuote: Ref<string>, market: Ref<string>) {
  const marketStatus = ref<MarketStatusView[]>([]);
  const exchangeRates = ref<ExchangeRateView[]>([]);
  const availableQuotes = ref<string[]>(["KRW"]);
  const marketSummaries = ref<Record<string, MarketSummaryView>>({});
  const statusError = ref("");
  const quoteLoadError = ref("");

  const selectedMarketSummary = computed(() => marketSummaries.value[market.value]);
  const selectedMarketStatus = computed(() =>
    marketStatus.value.find((status) => status.market === market.value || status.code === market.value),
  );

  const marketStatusCautions = computed(() => {
    const caution = selectedMarketStatus.value?.caution;
    if (!caution || typeof caution !== "object") return [];
    return Object.entries(caution)
      .filter(([, active]) => active)
      .map(([key]) => CAUTION_LABELS[key] ?? key)
      .sort();
  });

  const selectedMarketTradeCurrency = computed(() => {
    const fromSummary = selectedMarketSummary.value?.trade_currency;
    if (typeof fromSummary === "string" && fromSummary.length > 0) return fromSummary;
    const fromStatus = selectedMarketStatus.value?.trade_currency;
    if (typeof fromStatus === "string" && fromStatus.length > 0) return fromStatus;
    return "-";
  });

  function parseLegacyMarketWarning(value: unknown): string {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    if (!normalized || normalized.toUpperCase() === "NONE") return "";
    return normalized;
  }

  function parseLegacyMarketRestriction(value: unknown): string {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    if (!normalized) return "";
    if (normalized.toUpperCase() === "NONE") return "없음";
    return normalized;
  }

  const marketState = computed(() => {
    const current = selectedMarketStatus.value;
    if (!current) return "확인중";

    if (typeof current.warning === "boolean") {
      const warningText = current.warning
        ? "제재 경보"
        : marketStatusCautions.value.length > 0
          ? "주의 항목"
          : "정상";
      return marketStatusCautions.value.length > 0
        ? `${warningText} (${marketStatusCautions.value.join(", ")})`
        : warningText;
    }

    if (marketStatusCautions.value.length > 0) {
      return `주의 항목 (${marketStatusCautions.value.join(", ")})`;
    }

    const fallbackWarning =
      parseLegacyMarketWarning(current.market_warning_message) ||
      parseLegacyMarketWarning(current.market_warning) ||
      "";
    if (fallbackWarning.length > 0) return fallbackWarning;

    const event = current.market_event;
    if (typeof event === "string" && event.length > 0) return event;

    return "정상";
  });

  const marketRestriction = computed(() => {
    const current = selectedMarketStatus.value;
    if (!current) return "-";
    if (typeof current.warning === "boolean") return current.warning ? "있음" : "없음";
    const rawWarning = parseLegacyMarketRestriction(current.market_warning);
    if (rawWarning) return rawWarning;
    return "-";
  });

  const usdKrwRate = computed(() => {
    const rate = exchangeRates.value.find((entry) => entry.currency === "USD");
    if (!rate) return null;
    const raw = rate.base_price ?? rate.rate ?? "";
    const normalized = Number(String(raw).replaceAll(",", ""));
    if (Number.isNaN(normalized)) return null;
    return normalized;
  });

  async function loadAvailableQuotes() {
    try {
      const summaries = await getAvailableQuotes();
      const quotes = summaries.map((summary) => summary.quote).filter(Boolean);

      availableQuotes.value = quotes.length > 0 ? quotes : ["KRW"];
      if (!availableQuotes.value.includes(selectedQuote.value)) {
        selectedQuote.value = availableQuotes.value[0];
      }
      quoteLoadError.value = "";
    } catch {
      availableQuotes.value = ["KRW"];
      selectedQuote.value = "KRW";
      quoteLoadError.value = "지원 가능한 마켓 기준통화 목록을 불러오지 못했습니다.";
    }
  }

  async function loadMeta() {
    try {
      exchangeRates.value = await getExchangeRates();
    } catch {
      exchangeRates.value = [];
    }

    try {
      const summariesPayload = await getMarketSummaries({
        quote: selectedQuote.value,
        isDetails: true,
      });
      marketSummaries.value = Object.fromEntries(
        summariesPayload.map((item) => [item.market, item]),
      );
    } catch {
      marketSummaries.value = {};
    }
  }

  async function loadMarketStatus(nextMarket: string) {
    try {
      marketStatus.value = await getMarketStatus([nextMarket]);
      statusError.value = "";
    } catch (error) {
      marketStatus.value = [];
      statusError.value = `마켓 상태 로딩 실패: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`;
    }
  }

  return {
    marketStatus,
    exchangeRates,
    availableQuotes,
    marketSummaries,
    statusError,
    quoteLoadError,
    selectedMarketSummary,
    selectedMarketStatus,
    marketStatusCautions,
    selectedMarketTradeCurrency,
    marketState,
    marketRestriction,
    usdKrwRate,
    loadAvailableQuotes,
    loadMeta,
    loadMarketStatus,
  };
}
