<script setup lang="ts">
import { computed } from "vue";
import { Chart } from "highcharts-vue";
import type { Options } from "highcharts";
import * as Highcharts from "highcharts";
import stock from "highcharts/modules/stock";
import { useCandleStore } from "../../stores/candle.js";

stock(Highcharts);

const candleStore = useCandleStore();
const hasCandles = computed(() => candleStore.candles.length > 0);
const lastPrice = computed(() => {
  const last = candleStore.candles[candleStore.candles.length - 1];
  return last ? last.close : null;
});
const candleCount = computed(() => candleStore.candles.length);
const chartOptions = computed<Options>(() => ({
  chart: {
    type: "candlestick",
    height: 410,
    backgroundColor: "transparent",
    animation: false,
  },
  title: { text: "" },
  credits: { enabled: false },
  xAxis: {
    type: "datetime",
    tickColor: "rgba(255, 255, 255, 0.15)",
    lineColor: "rgba(255, 255, 255, 0.2)",
    labels: { style: { color: "#b2b9c8" } },
  },
  yAxis: {
    title: { text: null },
    gridLineColor: "rgba(255, 255, 255, 0.1)",
    labels: { style: { color: "#b2b9c8" } },
  },
  series: [
    {
      type: "candlestick",
      name: "KRW Price",
      color: "#f97373",
      upColor: "#6cb5ff",
      data: candleStore.candles.map((candle) => [
        candle.timestamp,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
      ]),
    },
  ],
  plotOptions: {
    candlestick: {
      lineWidth: 1,
      states: {
        hover: {
          lineWidth: 1.5,
        },
      },
    },
  },
}));
</script>

<template>
  <section class="chart">
    <div class="chart-head">
      <p class="chart-title">1분봉</p>
      <p class="chart-sub">
        {{ hasCandles ? `최근 ${candleCount.toLocaleString()}개 캔들` : "데이터 연결 대기" }}
      </p>
    </div>
    <p class="chart-price" v-if="lastPrice !== null">현재가 {{ lastPrice.toLocaleString() }}</p>
    <Chart v-if="hasCandles" :options="chartOptions" :highcharts="Highcharts" />
    <p v-else class="chart-empty">캔들 데이터를 불러오는 중입니다.</p>
  </section>
</template>

<style scoped>
.chart {
  min-width: 0;
}

.chart-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.chart-title {
  margin: 0;
  color: #f5f8ff;
  font-size: 18px;
  font-weight: 700;
}

.chart-sub {
  margin: 0;
  color: #9bb0cb;
  font-size: 12px;
}

.chart-price {
  margin: 0 0 10px;
  color: #d9e2f0;
  font-size: 14px;
}

.chart-empty {
  margin: 64px 0;
  text-align: center;
  color: #9fb0c4;
}
</style>
