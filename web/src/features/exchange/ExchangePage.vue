<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import CandleChart from "./CandleChart.vue";
import CoinList from "./CoinList.vue";
import ExchangeHero from "./ExchangeHero.vue";
import MarketMovementPanel from "./MarketMovementPanel.vue";
import OrderbookPanel from "./OrderbookPanel.vue";
import TradeList from "./TradeList.vue";
import { useExchangeData } from "../../composables/useExchangeData.js";
import { useMarketMeta } from "../../composables/useMarketMeta.js";
import { useCandleStore } from "../../stores/candle.js";
import { CANDLE_COUNT_OPTIONS, TIMEFRAME_OPTIONS } from "../../constants/exchange.js";
import { DEFAULT_MARKET } from "../../constants/market.js";
import type { CandleTimeframe } from "../../api/rest.js";

const market = ref(DEFAULT_MARKET);
const selectedQuote = ref("KRW");
const candleTimeframe = ref<CandleTimeframe>("1m");
const candleCount = ref(200);
const candleStore = useCandleStore();

const timeframeOptions = TIMEFRAME_OPTIONS;
const countOptions = CANDLE_COUNT_OPTIONS;
const visibleCandleCount = computed(() => candleStore.candles.length);
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
</script>

<template>
  <main class="exchange-page">
    <ExchangeHero
      :exchange-error="exchangeError"
      :status-error="statusError"
      :market="market"
      :selected-market-label="selectedMarketLabel"
      :market-state="marketState"
      :quote="selectedMarketSummary?.quote ?? 'KRW'"
      :selected-market-status="selectedMarketStatus"
      :selected-market-summary="selectedMarketSummary"
      :market-restriction="marketRestriction"
      :market-status-cautions="marketStatusCautions"
      :live-ticker="liveTicker"
      :spread-ratio="selectedOrderbook ? selectedMarketSpread?.ratio : undefined"
      :usd-krw-rate="usdKrwRate"
    />

    <section class="exchange-layout">
      <section class="panel-stack">
        <section class="panel panel-chart">
          <div class="panel-head">
            <h2>캔들 차트</h2>
            <span class="chart-sub">{{ chartSubLabel }}</span>
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
          <CandleChart :timeframe="candleTimeframe" />
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
        <CoinList :selected="market" @select="market = $event" />
      </aside>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
}

.exchange-page {
  min-height: 100vh;
  padding: 0 0 36px;
  color: var(--text);
  font-family: $font-sans;
  background:
    radial-gradient(1100px 500px at 50% -120px, var(--bg-glow), transparent 65%),
    linear-gradient(to bottom right, var(--bg-page), var(--bg-page-mid) 38%, var(--bg-page-soft) 72%);
}

.exchange-hero,
.exchange-layout {
  width: min(1500px, calc(100% - 40px));
  margin: 0 auto;
  padding-bottom: 14px;
}

.exchange-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 14px;
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
  text-align: right;
  white-space: nowrap;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(104px, 140px);
  grid-template-areas:
    "timeframe count";
  align-items: end;
  gap: 6px 10px;
}

.timeframe-group {
  grid-area: timeframe;
  display: grid;
  gap: 6px;
  min-width: 0;
}

.timeframe-label {
  min-width: 0;
}

.chart-control--count {
  grid-area: count;
  width: 100%;
  justify-self: end;
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
  display: grid;
  grid-template-columns: minmax(96px, 0.42fr) minmax(0, 1fr);
  gap: 10px;
  max-height: calc(100svh - 28px);
  overflow: hidden;
}

.panel-sidebar > .panel-head {
  grid-column: 1 / -1;
}

.panel-sidebar :deep(.coin-list) {
  display: contents;
}

.panel-sidebar :deep(.coin-search),
.panel-sidebar :deep(.coin-tools),
.panel-sidebar :deep(.coin-list__rows),
.panel-sidebar :deep(.coin-empty) {
  min-width: 0;
}

.panel-sidebar :deep(.coin-search) {
  grid-column: 2;
  align-self: end;
}

.panel-sidebar :deep(.coin-tools),
.panel-sidebar :deep(.coin-list__rows),
.panel-sidebar :deep(.coin-empty) {
  grid-column: 1 / -1;
}

.panel-sidebar :deep(input) {
  color: var(--text);
  border-color: var(--input-border);
  background: var(--input-bg);
}

.quote-selector {
  grid-column: 1;
  align-self: end;
  display: grid;
  gap: 8px;
  margin: 0;
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
  max-height: min(70vh, 560px);
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
    padding-top: 0;
  }

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
    max-height: none;
    overflow: visible;
  }

  .split-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 640px) {
  .exchange-hero,
  .exchange-layout {
    width: min(640px, calc(100% - 20px));
  }

  .panel-sidebar {
    grid-template-columns: 1fr;
  }

  .quote-selector,
  .panel-sidebar :deep(.coin-search) {
    grid-column: 1;
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
