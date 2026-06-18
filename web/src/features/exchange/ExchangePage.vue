<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import CandleChart from "./CandleChart.vue";
import CoinList from "./CoinList.vue";
import OrderbookPanel from "./OrderbookPanel.vue";
import TradeList from "./TradeList.vue";
import {
  getCandles,
  getCoinList,
  getAvailableQuotes,
  getExchangeRates,
  getTradeSnapshot,
  getMarketSummaries,
  getMarketStatus,
  TIMEFRAME_LABELS,
} from "../../api/rest.js";
import { useMarketSocket } from "../../composables/useMarketSocket.js";
import { useCandleStore } from "../../stores/candle.js";
import { useMarketStore } from "../../stores/market.js";
import { useOrderbookStore } from "../../stores/orderbook.js";
import { useTradeStore } from "../../stores/trade.js";
import { useTickerStore } from "../../stores/ticker.js";
import type { CandleTimeframe, ExchangeRateView, MarketStatusView, MarketSummaryView } from "../../api/rest.js";

interface TimeframeOption {
  value: CandleTimeframe;
  label: string;
}

const market = ref("KRW-BTC");
const selectedQuote = ref("KRW");
const candleTimeframe = ref<CandleTimeframe>("1m");
const candleCount = ref(200);
const marketStatus = ref<MarketStatusView[]>([]);
const exchangeRates = ref<ExchangeRateView[]>([]);
const availableQuotes = ref<string[]>(["KRW"]);
const marketSummaries = ref<Record<string, MarketSummaryView>>({});
const tradeStore = useTradeStore();
const statusError = ref("");
const { subscribe, unsubscribe } = useMarketSocket();
const marketStore = useMarketStore();
const candleStore = useCandleStore();
const tickerStore = useTickerStore();
const orderbookStore = useOrderbookStore();
const exchangeError = ref("");
const quoteLoadError = ref("");
const activeCandleChannel = ref<("candle" | `candle.${string}`) | null>(null);
const activeTickerMarkets = ref<string[]>([]);

function resolveCandleSubscriptionChannel(
  timeframe: CandleTimeframe,
): ("candle" | `candle.${string}`) | null {
  if (timeframe === "1s") return "candle.1s";
  if (timeframe === "1m") return "candle.1m";
  if (timeframe === "3m") return "candle.3m";
  if (timeframe === "5m") return "candle.5m";
  if (timeframe === "10m") return "candle.10m";
  if (timeframe === "15m") return "candle.15m";
  if (timeframe === "30m") return "candle.30m";
  if (timeframe === "60m") return "candle.60m";
  if (timeframe === "240m") return "candle.240m";
  if (timeframe === "1h") return "candle.60m";
  if (timeframe === "4h") return "candle.240m";
  return null;
}

const timeframeOptions: TimeframeOption[] = [
  { value: "1s", label: TIMEFRAME_LABELS["1s"] },
  { value: "1m", label: `${TIMEFRAME_LABELS["1m"]} (기본)` },
  { value: "3m", label: `${TIMEFRAME_LABELS["3m"]}` },
  { value: "5m", label: `${TIMEFRAME_LABELS["5m"]}` },
  { value: "15m", label: `${TIMEFRAME_LABELS["15m"]}` },
  { value: "30m", label: `${TIMEFRAME_LABELS["30m"]}` },
  { value: "60m", label: `${TIMEFRAME_LABELS["60m"]}` },
  { value: "240m", label: `${TIMEFRAME_LABELS["240m"]}` },
  { value: "1h", label: `${TIMEFRAME_LABELS["1h"]}` },
  { value: "4h", label: `${TIMEFRAME_LABELS["4h"]}` },
  { value: "1d", label: `${TIMEFRAME_LABELS["1d"]}` },
  { value: "1w", label: `${TIMEFRAME_LABELS["1w"]}` },
  { value: "1M", label: `${TIMEFRAME_LABELS["1M"]}` },
  { value: "1mo", label: `${TIMEFRAME_LABELS["1mo"]}` },
  { value: "1y", label: `${TIMEFRAME_LABELS["1y"]}` },
];

const countOptions = [30, 50, 100, 200];

const selectedMarketLabel = computed(() => {
  const current = marketStore.list.find((item) => item.market === market.value);
  if (!current) return market.value;
  return `${current.koreanName} (${current.englishName})`;
});

const liveTicker = computed(() => tickerStore.byMarket[market.value]);
const selectedOrderbook = computed(() => orderbookStore.current);
const selectedMarketSummary = computed(() => marketSummaries.value[market.value]);
const selectedMarketStatus = computed(() =>
  marketStatus.value.find((status) => status.market === market.value || status.code === market.value),
);
const selectedMarketSpread = computed(() => {
  const rows = selectedOrderbook.value?.units ?? [];
  if (rows.length === 0) return null;
  const ask = rows[0].askPrice;
  const bid = rows[0].bidPrice;
  if (!ask || !bid) return null;
  return {
    ask,
    bid,
    ratio: ((ask - bid) / bid) * 100,
    amount: ask - bid,
  };
});

const usdKrwRate = computed(() => {
  const rate = exchangeRates.value.find((entry) => entry.currency === "USD");
  if (!rate) return null;
  const raw = rate.base_price ?? rate.rate ?? "";
  const normalized = Number(String(raw).replaceAll(",", ""));
  if (Number.isNaN(normalized)) return null;
  return normalized;
});

const cautionLabels: Record<string, string> = {
  PRICE_FLUCTUATIONS: "가격 급변동",
  TRADING_VOLUME_SOARING: "거래량 급증",
  DEPOSIT_AMOUNT_SOARING: "예치량 급증",
  GLOBAL_PRICE_DIFFERENCES: "가격 괴리 확대",
  CONCENTRATION_OF_SMALL_ACCOUNTS: "소수 계정 집중",
};

const marketStatusCautions = computed(() => {
  const caution = selectedMarketStatus.value?.caution;
  if (!caution || typeof caution !== "object") return [];
  return Object.entries(caution)
    .filter(([, active]) => active)
    .map(([key]) => cautionLabels[key] ?? key)
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
  if (!current) {
    return "확인중";
  }

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
  if (fallbackWarning.length > 0) {
    return fallbackWarning;
  }

  const event = current.market_event;
  if (typeof event === "string" && event.length > 0) {
    return event;
  }

  return "정상";
});

const marketRestriction = computed(() => {
  const current = selectedMarketStatus.value;
  if (!current) return "-";
  if (typeof current.warning === "boolean") {
    return current.warning ? "있음" : "없음";
  }
  const rawWarning = parseLegacyMarketRestriction(current.market_warning);
  if (rawWarning) return rawWarning;
  return "-";
});

const topByVolume = computed(() => {
  return [...Object.values(tickerStore.byMarket)]
    .filter((item) => typeof item.accTradePrice24h === "number")
    .sort((a, b) => b.accTradePrice24h - a.accTradePrice24h)
    .slice(0, 3);
});

const topGainers = computed(() => {
  return [...Object.values(tickerStore.byMarket)]
    .filter((item) => typeof item.signedChangeRate === "number")
    .sort((a, b) => b.signedChangeRate - a.signedChangeRate)
    .slice(0, 3);
});
const topLosers = computed(() => {
  return [...Object.values(tickerStore.byMarket)]
    .filter((item) => typeof item.signedChangeRate === "number")
    .sort((a, b) => a.signedChangeRate - b.signedChangeRate)
    .slice(0, 3);
});

function formatPrice(value?: number): string {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatCompact(value?: number): string {
  if (typeof value !== "number") return "-";
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return formatPrice(value);
}

function formatRate(rate?: number): string {
  if (typeof rate !== "number") return "-";
  return `${(rate * 100).toFixed(2)}%`;
}

function formatRatio(ratio?: number): string {
  if (typeof ratio !== "number") return "-";
  return `${ratio >= 0 ? "+" : ""}${ratio.toFixed(3)}%`;
}

function resolveMarketName(marketCode: string): string {
  const found = marketStore.list.find((item) => item.market === marketCode);
  return found ? found.koreanName : marketCode;
}

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

async function loadMarketsByQuote(nextQuote: string): Promise<string> {
  const previousMarkets = [...activeTickerMarkets.value];

  try {
    const list = await getCoinList({ quote: nextQuote, isDetails: false });
    marketStore.setList(list);

    const nextMarkets = list.map((item) => item.market);

    const toSubscribe = nextMarkets.filter((marketCode) => !previousMarkets.includes(marketCode));
    const toUnsubscribe = previousMarkets.filter((marketCode) => !nextMarkets.includes(marketCode));

    if (toUnsubscribe.length > 0) {
      unsubscribe("ticker", toUnsubscribe);
    }
    if (toSubscribe.length > 0) {
      subscribe("ticker", toSubscribe);
    }

    activeTickerMarkets.value = nextMarkets;

    const nextSelected = list.some((item) => item.market === market.value)
      ? market.value
      : list[0]?.market;

    if (nextSelected) {
      market.value = nextSelected;
    } else {
      market.value = "KRW-BTC";
    }

    exchangeError.value = "";
    return market.value;
  } catch (error) {
    exchangeError.value = `코인 목록 로딩 실패: ${
      error instanceof Error ? error.message : "알 수 없는 오류"
    }`;
    return market.value;
  }
}

async function loadMarket(nextMarket: string) {
  if (!nextMarket) {
    candleStore.setInitial([]);
    return;
  }

  try {
    candleStore.setInitial(
      await getCandles(nextMarket, {
        timeframe: candleTimeframe.value,
        count: candleCount.value,
      }),
    );
    exchangeError.value = "";
  } catch (error) {
    candleStore.setInitial([]);
    exchangeError.value = `캔들 로딩 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
  } finally {
    const nextCandleChannel = resolveCandleSubscriptionChannel(candleTimeframe.value);

    if (activeCandleChannel.value && activeCandleChannel.value !== nextCandleChannel) {
      unsubscribe(activeCandleChannel.value, [nextMarket]);
    }

    subscribe("orderbook", [nextMarket]);
    subscribe("trade", [nextMarket]);

    if (nextCandleChannel) {
      subscribe(nextCandleChannel, [nextMarket]);
    } else {
      if (activeCandleChannel.value) {
        unsubscribe(activeCandleChannel.value, [nextMarket]);
      }
    }
    activeCandleChannel.value = nextCandleChannel;

    try {
      tradeStore.setInitial(
        await getTradeSnapshot(nextMarket, {
          count: Math.min(candleCount.value, 50),
        }),
      );
    } catch {
      tradeStore.setInitial([]);
    }

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

onMounted(async () => {
  await loadAvailableQuotes();
  await loadMarketsByQuote(selectedQuote.value);
  await loadMeta();
  await loadMarket(market.value);
});

watch(selectedQuote, (nextQuote) => {
  void loadMarketsByQuote(nextQuote).then((nextMarket) => {
    void loadMarket(nextMarket);
  });
});

watch(market, (nextMarket, previousMarket) => {
  unsubscribe("orderbook", [previousMarket]);
  unsubscribe("trade", [previousMarket]);
  if (activeCandleChannel.value) {
    unsubscribe(activeCandleChannel.value, [previousMarket]);
  }
  activeCandleChannel.value = null;
  void loadMarket(nextMarket);
});

watch(candleTimeframe, () => {
  void loadMarket(market.value);
});

watch(candleCount, () => {
  void loadMarket(market.value);
});
</script>

<template>
  <main class="exchange-page">
    <section class="exchange-hero">
      <p class="kicker">CoinBurrow Exchange Console</p>
      <h1>실시간 마켓 레이어</h1>
      <p class="hero-lead">코인 리스트, 1분봉, 호가, 체결 체인을 한 화면에서 연결해 전환하는 데 걸리는 시간을 최소화한 대시보드입니다.</p>
      <div class="hero-metrics">
        <p v-if="exchangeError" class="hero-error">{{ exchangeError }}</p>
        <p v-if="statusError" class="hero-error">{{ statusError }}</p>
        <article class="metric-card">
          <span>선택 마켓</span>
          <strong>{{ selectedMarketLabel }}</strong>
        </article>
        <article class="metric-card">
          <span>시장 상태</span>
          <strong>{{ marketState }}</strong>
        </article>
        <article class="metric-card">
          <span>마켓 구분</span>
          <strong>{{ selectedMarketSummary?.quote ?? "KRW" }}</strong>
        </article>
        <article class="metric-card">
          <span>거래대금(24h)</span>
          <strong>{{ formatPrice(liveTicker?.accTradePrice24h) }}</strong>
        </article>
        <article class="metric-card">
          <span>스프레드</span>
          <strong>{{ formatRatio(selectedOrderbook ? selectedMarketSpread?.ratio : undefined) }}</strong>
        </article>
        <article class="metric-card">
          <span>실시간 채널</span>
          <strong>ticker / candle / orderbook / trade</strong>
        </article>
        <article v-if="usdKrwRate" class="metric-card">
          <span>USD/KRW</span>
          <strong>{{ formatPrice(usdKrwRate) }}</strong>
        </article>
      </div>
    </section>

    <section class="exchange-layout">
      <aside class="panel panel-sidebar">
        <div class="panel-head">
          <h2>코인 리스트</h2>
          <span class="muted">빠른 전환 · 실시간 검색</span>
        </div>
        <label class="quote-selector">
          <span>기준통화</span>
          <select v-model="selectedQuote" :disabled="availableQuotes.length === 0">
            <option v-for="quote in availableQuotes" :key="quote" :value="quote">
              {{ quote }}
            </option>
          </select>
        </label>
        <CoinList :selected="market" @select="market = $event" />
      </aside>

      <section class="panel-stack">
        <section class="panel panel-chart">
          <div class="panel-head">
            <h2>캔들 차트</h2>
            <span class="muted">차트 단위/범위 제어</span>
          </div>
          <div class="chart-controls">
            <label class="chart-control">
              <span>타임프레임</span>
              <select v-model="candleTimeframe">
                <option v-for="option in timeframeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="chart-control">
              <span>개수</span>
              <select v-model.number="candleCount">
                <option v-for="count in countOptions" :key="count" :value="count">
                  {{ count }}개
                </option>
              </select>
            </label>
          </div>
          <p class="panel-sub">
            {{ selectedMarketLabel }} · 가격 추이와 변동성 추적
          </p>
          <CandleChart :timeframe="candleTimeframe" />
        </section>

        <section class="panel">
          <div class="panel-head">
            <h3>마켓 무브먼트</h3>
            <span class="muted">상승·하락 상위</span>
          </div>
          <div class="ticker-grid">
            <div class="ticker-col">
              <p class="ticker-col__title ticker-col__title--up">상승 TOP</p>
              <ul>
                <li v-for="ticker in topGainers" :key="ticker.market">
                  <span>{{ resolveMarketName(ticker.market) }}</span>
                  <strong :class="{ up: true }">{{ formatRate(ticker.signedChangeRate) }}</strong>
                </li>
              </ul>
            </div>
            <div class="ticker-col">
              <p class="ticker-col__title ticker-col__title--down">하락 TOP</p>
              <ul>
                <li v-for="ticker in topLosers" :key="ticker.market">
                  <span>{{ resolveMarketName(ticker.market) }}</span>
                  <strong :class="{ down: true }">{{ formatRate(ticker.signedChangeRate) }}</strong>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h3>거래대금 TOP</h3>
            <span class="muted">24h 거래대금 기준</span>
          </div>
          <div class="summary-list-wrap">
            <ul class="summary-list">
              <li v-for="ticker in topByVolume" :key="ticker.market">
                <span>{{ resolveMarketName(ticker.market) }}</span>
                <strong>{{ formatCompact(ticker.accTradePrice24h) }}</strong>
              </li>
            </ul>
          </div>
        </section>

        <div class="split-grid">
          <section class="panel">
            <div class="panel-head">
              <h3>선택 마켓 상세</h3>
              <span class="muted">요약/경고/이벤트</span>
            </div>
            <p v-if="selectedMarketStatus" class="market-summary-empty">
              {{ marketState }}
            </p>
            <p v-else class="market-summary-empty">선택 마켓 메타정보 대기중입니다.</p>
            <dl class="market-summary-grid">
              <div>
                <dt>마켓</dt>
                <dd>{{ selectedMarketSummary?.market ?? market }}</dd>
              </div>
              <div>
                <dt>심볼</dt>
                <dd>{{ selectedMarketSummary?.englishName ?? "-" }}</dd>
              </div>
              <div>
                <dt>거래 통화</dt>
                <dd>{{ selectedMarketTradeCurrency }}</dd>
              </div>
              <div>
                <dt>제재</dt>
                <dd>{{ marketRestriction }}</dd>
              </div>
              <div>
                <dt>주의 항목</dt>
                <dd v-if="marketStatusCautions.length === 0">-</dd>
                <dd v-else>
                  <ul class="market-caution-list">
                    <li v-for="caution in marketStatusCautions" :key="caution">
                      {{ caution }}
                    </li>
                  </ul>
                </dd>
              </div>
            </dl>
          </section>
          <section class="panel">
            <div class="panel-head">
              <h3>호가</h3>
              <span class="muted">호가창 깊이</span>
            </div>
            <OrderbookPanel />
          </section>
          <section class="panel">
            <div class="panel-head">
              <h3>체결</h3>
              <span class="muted">최근 50개</span>
            </div>
            <TradeList />
          </section>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
}

.exchange-page {
  min-height: 100vh;
  padding: clamp(30px, 6svh, 54px) 0 40px;
  color: #f2f0dd;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    radial-gradient(1100px 500px at 50% -120px, rgba(95, 141, 78, 0.2), transparent 65%),
    linear-gradient(to bottom right, #111827, #1a2030 38%, #222f43 72%);
}

.exchange-hero,
.exchange-layout {
  width: min(1500px, calc(100% - 40px));
  margin: 0 auto;
}

.exchange-hero {
  margin-bottom: clamp(22px, 4vw, 34px);
}

.kicker {
  display: inline-flex;
  margin: 0 0 12px;
  color: #a8d1a3;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(36px, 5.3vw, 52px);
  line-height: 1.06;
  letter-spacing: 0;
}

.hero-lead {
  margin: 14px 0 24px;
  max-width: 840px;
  color: #c2cedf;
  font-size: 19px;
  line-height: 1.7;
}

.hero-error {
  grid-column: 1 / -1;
  margin: 0;
  border-radius: 12px;
  border: 1px solid rgba(255, 123, 123, 0.45);
  background: rgba(220, 50, 50, 0.18);
  color: #ffe7e7;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 700;
  padding: 12px 14px;
}

.hero-metrics {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.metric-card {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
}

.metric-card span {
  display: block;
  margin-bottom: 8px;
  color: #b9c3d4;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.metric-card strong {
  color: #f2f0dd;
  font-size: 17px;
  line-height: 1.35;
  font-weight: 700;
}

.exchange-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 18px;
}

.panel-stack {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.panel {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.075);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.2);
}

.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2,
.panel-head h3 {
  margin: 0;
  color: #ffffff;
  font-size: 20px;
  letter-spacing: 0;
  line-height: 1.25;
}

.panel-head h3 {
  font-size: 18px;
}

.muted {
  color: #9aa7bc;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.panel-sub {
  margin: 0 0 14px;
  color: #bfc6d8;
  font-size: 15px;
}

.chart-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.chart-control {
  display: grid;
  gap: 6px;
  width: 220px;
  max-width: 100%;
}

.chart-control span {
  color: #b6c2d8;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.chart-control select {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.25);
  color: #f2f0dd;
}

.ticker-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ticker-col ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.ticker-col li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  padding-bottom: 8px;
}

.ticker-col li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.summary-list-wrap {
  display: block;
}

.ticker-col span {
  color: #d6e1f1;
  font-size: 13px;
}

.ticker-col__title {
  margin: 0 0 8px;
  color: #d2dced;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ticker-col__title--up {
  color: #6cb5ff;
}

.ticker-col__title--down {
  color: #f97373;
}

.summary-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.summary-list li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  padding-bottom: 8px;
}

.summary-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.summary-list span,
.summary-list strong {
  color: #d6e1f1;
}

.market-summary-empty {
  margin: 6px 0 12px;
  color: #b7c5d7;
}

.market-summary-grid {
  margin: 0;
  display: grid;
  gap: 10px;
}

.market-summary-grid dt {
  color: #9fb0c4;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.market-summary-grid dd {
  margin: 0;
  color: #f1f6ff;
}

.market-caution-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.market-caution-list li {
  margin: 0;
}

.split-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 360px);
}

.panel-sidebar {
  align-self: start;
}

.panel-sidebar :deep(.coin-list) {
  min-width: 0;
}

.panel-sidebar :deep(input) {
  color: #f2f2f2;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.2);
}

.quote-selector {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  margin-bottom: 10px;
}

.quote-selector span {
  color: #b9c3d4;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.quote-selector select {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  padding: 8px 10px;
  color: #f2f0dd;
  background: rgba(0, 0, 0, 0.2);
}

.panel-sidebar :deep(input::placeholder) {
  color: rgba(194, 207, 227, 0.72);
}

.panel-sidebar :deep(ul) {
  max-height: min(70vh, 560px);
  overflow: auto;
}

.panel-sidebar :deep(li) {
  color: #f2f0dd;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.panel-sidebar :deep(li.selected) {
  background: rgba(168, 209, 163, 0.18);
  border-color: rgba(168, 209, 163, 0.55);
}

.panel-sidebar :deep(small) {
  color: rgba(194, 207, 227, 0.75);
}

.panel-chart :deep(.chart) {
  min-height: 380px;
}

.panel :deep(h2),
.panel :deep(h3) {
  margin: 0;
}

.panel :deep(table),
.panel :deep(ul) {
  margin-top: 10px;
}

.panel :deep(.orderbook h2),
.panel :deep(.trades h2) {
  display: none;
}

.panel :deep(.orderbook table td) {
  color: #dde6f5;
  border-top-color: rgba(255, 255, 255, 0.16);
}

.panel :deep(.trades ul li) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
}

.panel :deep(.orderbook .ask),
.panel :deep(.trades .down) {
  color: #f97373;
}

.panel :deep(.orderbook .bid),
.panel :deep(.trades .up) {
  color: #6cb5ff;
}

@media (max-width: 1200px) {
  .exchange-page {
    padding-top: 28px;
  }

  .exchange-hero,
  .exchange-layout,
  .hero-metrics {
    width: min(1300px, calc(100% - 28px));
  }

  .hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .chart-controls {
    flex-direction: column;
    width: 100%;
  }
}

@media (max-width: 960px) {
  .exchange-page {
    padding-bottom: 24px;
  }

  .exchange-layout {
    grid-template-columns: 1fr;
  }

  .split-grid {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: clamp(34px, 7.4vw, 44px);
  }

  .hero-lead {
    font-size: 18px;
  }
}

@media (max-width: 640px) {
  .exchange-hero,
  .exchange-layout {
    width: min(640px, calc(100% - 20px));
  }

  .hero-lead {
    font-size: 16px;
  }

  .hero-metrics,
  .split-grid,
  .panel-head {
    gap: 10px;
  }

  .ticker-grid {
    grid-template-columns: 1fr;
  }

  .chart-control {
    width: 100%;
  }

  .exchange-page {
    padding-top: 22px;
  }

  .metric-card strong {
    font-size: 16px;
  }

  .panel {
    padding: 16px;
  }
}
</style>
