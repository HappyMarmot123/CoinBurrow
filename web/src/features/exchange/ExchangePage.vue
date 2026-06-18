<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import CandleChart from "./CandleChart.vue";
import CoinList from "./CoinList.vue";
import ExchangeHero from "./ExchangeHero.vue";
import MarketMovementPanel from "./MarketMovementPanel.vue";
import MarketSummaryPanel from "./MarketSummaryPanel.vue";
import OrderbookPanel from "./OrderbookPanel.vue";
import TradeList from "./TradeList.vue";
import { useExchangeData } from "../../composables/useExchangeData.js";
import { useMarketMeta } from "../../composables/useMarketMeta.js";
import { CANDLE_COUNT_OPTIONS, TIMEFRAME_OPTIONS } from "../../constants/exchange.js";
import { DEFAULT_MARKET } from "../../constants/market.js";
import type { CandleTimeframe } from "../../api/rest.js";

const market = ref(DEFAULT_MARKET);
const selectedQuote = ref("KRW");
const candleTimeframe = ref<CandleTimeframe>("1m");
const candleCount = ref(200);

const timeframeOptions = TIMEFRAME_OPTIONS;
const countOptions = CANDLE_COUNT_OPTIONS;

const {
  availableQuotes,
  statusError,
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
  unsubscribeMarket(previousMarket);
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
    <ExchangeHero
      :exchange-error="exchangeError"
      :status-error="statusError"
      :selected-market-label="selectedMarketLabel"
      :market-state="marketState"
      :quote="selectedMarketSummary?.quote ?? 'KRW'"
      :live-ticker="liveTicker"
      :spread-ratio="selectedOrderbook ? selectedMarketSpread?.ratio : undefined"
      :usd-krw-rate="usdKrwRate"
    />

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

        <MarketMovementPanel
          :top-gainers="topGainers"
          :top-losers="topLosers"
          :top-by-volume="topByVolume"
          :resolve-market-name="resolveMarketName"
        />

        <div class="split-grid">
          <MarketSummaryPanel
            :market="market"
            :selected-market-status="selectedMarketStatus"
            :selected-market-summary="selectedMarketSummary"
            :market-state="marketState"
            :selected-market-trade-currency="selectedMarketTradeCurrency"
            :market-restriction="marketRestriction"
            :market-status-cautions="marketStatusCautions"
          />
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

<style scoped lang="scss">
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
