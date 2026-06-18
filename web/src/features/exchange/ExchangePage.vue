<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
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

async function loadMarket(nextMarket: string) {
  candleStore.setInitial(await getCandles(nextMarket));
  subscribe("orderbook", [nextMarket]);
  subscribe("candle", [nextMarket]);
  subscribe("trade", [nextMarket]);
}

onMounted(async () => {
  marketStore.setList(await getCoinList());
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
  <main class="exchange">
    <CoinList :selected="market" @select="market = $event" />
    <section class="main-panel">
      <CandleChart />
      <div class="bottom">
        <OrderbookPanel />
        <TradeList />
      </div>
    </section>
  </main>
</template>

<style scoped>
.exchange {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 24px;
  padding: 24px;
  color: #172033;
  background: #f7f9fc;
}

.main-panel {
  display: grid;
  min-width: 0;
  gap: 18px;
}

.bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 360px);
  gap: 18px;
}

@media (max-width: 800px) {
  .exchange,
  .bottom {
    grid-template-columns: 1fr;
  }
}
</style>
