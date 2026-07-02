<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import AppNav from "../../components/AppNav.vue";
import CandleChart from "./CandleChartV2.vue";
import DailyStatsPanel from "./DailyStatsPanel.vue";
import CoinList from "./CoinList.vue";
import ExchangeHero from "./ExchangeHero.vue";
import MarketMovementPanel from "./MarketMovementPanel.vue";
import OrderbookPanel from "./OrderbookPanel.vue";
import DerivativesPanel from "./DerivativesPanel.vue";
import TradeList from "./TradeList.vue";
import CoinMetaDrawer from "./CoinMetaDrawer.vue";
import { useDerivatives } from "../../composables/useDerivatives.js";
import { useExchangeData } from "../../composables/useExchangeData.js";
import { useMarketMeta } from "../../composables/useMarketMeta.js";
import { useCoinMeta } from "../../composables/useCoinMeta.js";
import { useFreeApiPolicy } from "../../composables/useFreeApiPolicy.js";
import { useCandleStore } from "../../stores/candle.js";
import { CANDLE_COUNT_OPTIONS, TIMEFRAME_OPTIONS } from "../../constants/exchange.js";
import { DEFAULT_MARKET } from "../../constants/market.js";
import type { CandleTimeframe } from "../../api/rest.js";
import { toTradingViewChartUrl } from "./tradingViewSymbol.js";

const market = ref(DEFAULT_MARKET);
const selectedQuote = ref("KRW");
const candleTimeframe = ref<CandleTimeframe>("1m");
const candleCount = ref(200);
const candleStore = useCandleStore();

const timeframeOptions = TIMEFRAME_OPTIONS;
const countOptions = CANDLE_COUNT_OPTIONS;
const visibleCandleCount = computed(() => candleStore.candles.length);
const tradingViewChartUrl = computed(() => toTradingViewChartUrl(market.value));
const chartSubLabel = computed(() =>
  visibleCandleCount.value > 0
    ? `${candleTimeframe.value} · ${visibleCandleCount.value.toLocaleString()}개 캔들`
    : `${candleTimeframe.value} · 데이터 연결 대기`,
);
const primaryTimeframeOptions = timeframeOptions.filter(({ value }) =>
  ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"].includes(value),
);
let initializingExchange = true;
let loadingMarketFromQuote = false;

const {
  availableQuotes,
  statusError,
  selectedMarketSummary,
  selectedMarketStatus,
  marketStatusCautions,
  marketState,
  marketRestriction,
  usdKrwRate,
  loadAvailableQuotes,
  loadMeta,
  loadMarketStatus,
} = useMarketMeta(selectedQuote, market);

const {
  exchangeError,
  selectedMarketLabel,
  liveTicker,
  selectedOrderbook,
  selectedMarketSpread,
  topByVolume,
  topGainers,
  topLosers,
  resolveMarketName,
  loadMarketsByQuote,
  loadMarket,
  unsubscribeMarket,
} = useExchangeData({
  market,
  candleTimeframe,
  candleCount,
  loadMarketStatus,
});

const {
  derivatives,
  loading: derivativesLoading,
  error: derivativesError,
  hasDerivatives,
} = useDerivatives(market);

const {
  coinMeta,
  coinMetaError,
  coinMetaLoading,
  coinMetaLookupId,
  coinMetaSource,
} = useCoinMeta(market, selectedMarketSummary);
const {
  findPolicy,
  reload: loadPolicy,
} = useFreeApiPolicy();
const policy = computed(() => findPolicy(coinMetaSource.value));
const isCoinDetailOpen = ref(false);
const detailMarket = ref("");

async function loadQuoteMarkets(nextQuote: string) {
  loadingMarketFromQuote = true;
  let nextMarket = market.value;
  try {
    nextMarket = await loadMarketsByQuote(nextQuote);
    await nextTick();
  } finally {
    loadingMarketFromQuote = false;
  }

  await loadMarket(nextMarket);
  void loadMeta();
}

onMounted(async () => {
  try {
    await loadAvailableQuotes();
    await loadQuoteMarkets(selectedQuote.value);
    await loadPolicy();
  } finally {
    initializingExchange = false;
  }
});

watch(selectedQuote, (nextQuote) => {
  if (initializingExchange) return;
  void loadQuoteMarkets(nextQuote);
});

watch(market, (nextMarket, previousMarket) => {
  unsubscribeMarket(previousMarket);
  if (loadingMarketFromQuote) return;
  void loadMarket(nextMarket);
});

watch(candleTimeframe, () => {
  void loadMarket(market.value);
});

watch(candleCount, () => {
  void loadMarket(market.value);
});

function compactTimeframeLabel(label: string) {
  return label.replace(" (기본)", "");
}

function openCoinDetail(nextMarket: string) {
  market.value = nextMarket;
  detailMarket.value = nextMarket;
  isCoinDetailOpen.value = true;
}

function closeCoinDetail() {
  isCoinDetailOpen.value = false;
  detailMarket.value = "";
}
</script>

<template>
  <main class="exchange-page">
    <AppNav class="exchange-nav" />

    <section class="exchange-layout">
      <section class="panel-stack">
        <ExchangeHero
          :exchange-error="exchangeError"
          :status-error="statusError"
          :market="market"
          :selected-market-label="selectedMarketLabel"
          :market-state="marketState"
          :quote="selectedMarketSummary?.quote ?? 'KRW'"
          :live-ticker="liveTicker"
          :spread-ratio="selectedOrderbook ? selectedMarketSpread?.ratio : undefined"
          :usd-krw-rate="usdKrwRate"
          :coin-meta="coinMeta"
        />
        <DailyStatsPanel
          :ticker="liveTicker"
          :market="market"
          :selected-market-summary="selectedMarketSummary"
          :selected-market-status="selectedMarketStatus"
          :market-state="marketState"
          @open-detail="openCoinDetail"
        />
        <section class="panel panel-chart">
          <div class="panel-head chart-panel-head">
            <div class="chart-panel-head__main">
              <h2>캔들 차트</h2>
              <span class="chart-sub">{{ chartSubLabel }}</span>
            </div>
            <a
              class="chart-tradingview-link"
              :href="tradingViewChartUrl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TradingView 차트에서 새 창으로 열기"
            >
              TradingView 열기
            </a>
          </div>
          <div class="chart-controls">
            <div class="chart-control chart-control--timeframe" data-row>
              <div class="timeframe-group">
                <span class="timeframe-label">타임프레임</span>
                <div class="timeframe-tabs" role="group" aria-label="주요 타임프레임">
                  <button
                    v-for="option in primaryTimeframeOptions"
                    :key="option.value"
                    :class="{ active: candleTimeframe === option.value }"
                    type="button"
                    @click="candleTimeframe = option.value"
                  >
                    {{ compactTimeframeLabel(option.label) }}
                  </button>
                </div>
              </div>
              <label class="chart-control chart-control--count">
                <span>개수</span>
                <select v-model.number="candleCount">
                  <option v-for="count in countOptions" :key="count" :value="count">
                    {{ count }}개
                  </option>
                </select>
              </label>
            </div>
          </div>
          <CandleChart :timeframe="candleTimeframe" :market="market" />
        </section>

        <div class="split-grid">
          <section class="panel">
            <div class="panel-head">
              <h3>호가</h3>
            </div>
            <OrderbookPanel />
          </section>
          <section class="panel">
            <div class="panel-head">
              <h3>체결</h3>
            </div>
            <TradeList :market="market" />
          </section>
          <DerivativesPanel
            v-if="hasDerivatives || derivativesLoading || derivativesError"
            :loading="derivativesLoading"
            :derivatives="derivatives"
            :error="hasDerivatives ? '' : derivativesError"
          />
        </div>

        <MarketMovementPanel
          :top-gainers="topGainers"
          :top-losers="topLosers"
          :top-by-volume="topByVolume"
          :resolve-market-name="resolveMarketName"
        />
      </section>

      <aside class="panel panel-sidebar">
        <div class="panel-head">
          <h2>코인 리스트</h2>
        </div>
        <label class="quote-selector">
          <span>기준통화</span>
          <select v-model="selectedQuote" :disabled="availableQuotes.length === 0">
            <option v-for="quote in availableQuotes" :key="quote" :value="quote">
              {{ quote }}
            </option>
          </select>
        </label>
        <CoinList :selected="market" :quote="selectedQuote" @select="market = $event" />
      </aside>

      <CoinMetaDrawer
        :open="isCoinDetailOpen"
        :market="detailMarket || market"
        :policy="policy"
        :selected-market-summary="selectedMarketSummary"
        :selected-market-status="selectedMarketStatus"
        :market-restriction="marketRestriction"
        :market-status-cautions="marketStatusCautions"
        :live-ticker="liveTicker"
        :spread-ratio="selectedOrderbook ? selectedMarketSpread?.ratio : undefined"
        :usd-krw-rate="usdKrwRate"
        :coin-meta="coinMeta"
        :coin-meta-loading="coinMetaLoading"
        :coin-meta-error="coinMetaError"
        :coin-meta-source="coinMetaSource"
        :coin-meta-lookup-id="coinMetaLookupId"
        @close="closeCoinDetail"
      />
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
}

.exchange-page {
  min-height: 100vh;
  padding: 14px 0 36px;
  color: var(--text);
  font-family: $font-sans;
  background:
    radial-gradient(1100px 500px at 50% -120px, var(--bg-glow), transparent 65%),
    linear-gradient(to bottom right, var(--bg-page), var(--bg-page-mid) 38%, var(--bg-page-soft) 72%);
}

.exchange-nav {
  width: min(1500px, calc(100% - 40px));
  margin: 0 auto 12px;
}

.exchange-hero,
.exchange-layout {
  width: min(1500px, calc(100% - 40px));
  margin: 0 auto;
}

.exchange-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  padding: 14px;
  gap: 14px;
}

.panel-stack :deep(.exchange-hero) {
  width: 100%;
  margin: 0;
  padding-top: 0;
}

.panel-stack {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.panel {
  @include exchange-panel;
}

.panel-head {
  @include panel-head;
}

.panel-head h2,
.panel-head h3 {
  @include panel-title(19px);
}

.panel-head h3 {
  font-size: 17px;
}

.chart-sub {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.chart-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-panel-head__main {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-direction: row;
  white-space: nowrap;
}

.chart-tradingview-link {
  color: var(--c-up);
  border: 1px solid color-mix(in srgb, var(--panel-border-hover) 48%, var(--panel-border));
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition:
    border-color var(--ease),
    color var(--ease),
    background-color var(--ease);
}

.chart-tradingview-link:hover,
.chart-tradingview-link:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: color-mix(in srgb, var(--c-up-bg) 58%, transparent);
  outline: none;
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

.chart-control--timeframe[data-row] {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.timeframe-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.timeframe-label {
  white-space: nowrap;
  min-width: 0;
}

.chart-control--count {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-left: 0;
  white-space: nowrap;
}

.chart-control--count span {
  white-space: nowrap;
  flex-shrink: 0;
}

.timeframe-tabs {
  min-width: 0;
}

.chart-control span {
  @include muted-label;
}

.chart-control select {
  @include select-control;
}

.timeframe-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.timeframe-tabs button {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease);
}

.timeframe-tabs button:hover,
.timeframe-tabs button:focus-visible,
.timeframe-tabs button.active {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: var(--panel-bg-strong);
  outline: none;
}

.split-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr;
}

.panel-sidebar {
  position: sticky;
  top: 14px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100dvh - 56px);
  height: calc(100dvh - 56px);
  overflow: hidden;
}

.panel-sidebar :deep(.coin-list) {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
}

.panel-sidebar :deep(.coin-search),
.panel-sidebar :deep(.coin-tools),
.panel-sidebar :deep(.coin-list__rows),
.panel-sidebar :deep(.coin-empty) {
  min-width: 0;
}

.panel-sidebar :deep(input) {
  color: var(--text);
  border-color: var(--input-border);
  background: var(--input-bg);
}

.quote-selector {
  align-self: stretch;
  display: grid;
  gap: 8px;
  margin: 0;
  width: 100%;
}

.quote-selector span {
  @include muted-label;
}

.quote-selector select {
  @include select-control;
}

.panel-sidebar :deep(input::placeholder) {
  color: var(--text-dim);
}

.panel-sidebar :deep(ul) {
  max-height: none;
}

.panel-sidebar :deep(.coin-list__rows),
.panel-sidebar :deep(.coin-empty) {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}

.panel-sidebar :deep(li) {
  color: var(--text);
  border-color: var(--panel-border-soft);
  background: var(--panel-bg);
}

.panel-sidebar :deep(li.selected) {
  background: var(--c-up-bg);
  border-color: var(--panel-border-hover);
}

.panel-sidebar :deep(small) {
  color: var(--text-muted);
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
  color: var(--text);
  border-top-color: var(--panel-line);
}

.panel :deep(.trades ul li) {
  border-bottom-color: var(--panel-line);
}

.panel :deep(.orderbook .ask),
.panel :deep(.trades .down) {
  color: var(--c-down);
}

.panel :deep(.orderbook .bid),
.panel :deep(.trades .up) {
  color: var(--c-up);
}

@media (max-width: 1200px) {
  .exchange-page {
    padding-top: 14px;
  }

  .exchange-nav,
  .exchange-hero,
  .exchange-layout {
    width: min(1300px, calc(100% - 28px));
  }

  .chart-controls {
    flex-direction: column;
    width: 100%;
  }

  .chart-control--count {
    justify-self: end;
  }
}

@media (max-width: 960px) {
  .exchange-page {
    padding-bottom: 24px;
  }

  .exchange-layout {
    grid-template-columns: 1fr;
  }

  .panel-sidebar {
    position: relative;
    top: auto;
    height: auto;
    max-height: none;
    overflow: visible;
  }

  .split-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 640px) {
  .exchange-nav,
  .exchange-hero,
  .exchange-layout {
    width: min(640px, calc(100% - 20px));
  }

  .split-grid,
  .panel-head {
    gap: 10px;
  }

  .chart-control {
    width: 100%;
  }

  .panel {
    padding: 14px;
  }
}
</style>

