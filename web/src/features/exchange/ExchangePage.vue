<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import CandleChart from "./CandleChart.vue";
import CoinList from "./CoinList.vue";
import OrderbookPanel from "./OrderbookPanel.vue";
import TradeList from "./TradeList.vue";
import { getCandles, getCoinList } from "../../api/rest.js";
import { useMarketSocket } from "../../composables/useMarketSocket.js";
import { useCandleStore } from "../../stores/candle.js";
import { useMarketStore } from "../../stores/market.js";

const market = ref("KRW-BTC");
const { subscribe, unsubscribe } = useMarketSocket();
const marketStore = useMarketStore();
const candleStore = useCandleStore();
const exchangeError = ref("");

const selectedMarketLabel = computed(() => {
  const current = marketStore.list.find((item) => item.market === market.value);
  if (!current) return market.value;
  return `${current.koreanName} (${current.englishName})`;
});

async function loadMarket(nextMarket: string) {
  try {
    candleStore.setInitial(await getCandles(nextMarket));
    exchangeError.value = "";
  } catch (error) {
    candleStore.setInitial([]);
    exchangeError.value = `캔들 로딩 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
  } finally {
    subscribe("orderbook", [nextMarket]);
    subscribe("candle", [nextMarket]);
    subscribe("trade", [nextMarket]);
  }
}

onMounted(async () => {
  try {
    marketStore.setList(await getCoinList());
  } catch (error) {
    exchangeError.value = `코인 목록 로딩 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
  }
  subscribe(
    "ticker",
    marketStore.list.map((item) => item.market),
  );
  await loadMarket(market.value);
});

watch(market, (nextMarket, previousMarket) => {
  unsubscribe("orderbook", [previousMarket]);
  unsubscribe("candle", [previousMarket]);
  unsubscribe("trade", [previousMarket]);
  void loadMarket(nextMarket);
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
        <article class="metric-card">
          <span>선택 마켓</span>
          <strong>{{ selectedMarketLabel }}</strong>
        </article>
        <article class="metric-card">
          <span>거래 리스트</span>
          <strong>{{ marketStore.list.length.toLocaleString() }}개</strong>
        </article>
        <article class="metric-card">
          <span>실시간 채널</span>
          <strong>ticker / candle / orderbook / trade</strong>
        </article>
      </div>
    </section>

    <section class="exchange-layout">
      <aside class="panel panel-sidebar">
        <div class="panel-head">
          <h2>코인 리스트</h2>
          <span class="muted">빠른 전환 · 실시간 검색</span>
        </div>
        <CoinList :selected="market" @select="market = $event" />
      </aside>

      <section class="panel-stack">
        <section class="panel panel-chart">
          <div class="panel-head">
            <h2>캔들 차트</h2>
            <span class="muted">1분봉 실시간 갱신</span>
          </div>
          <p class="panel-sub">
            {{ selectedMarketLabel }} · 가격 추이와 변동성 추적
          </p>
          <CandleChart />
        </section>

        <div class="split-grid">
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
    grid-template-columns: 1fr 1fr;
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
