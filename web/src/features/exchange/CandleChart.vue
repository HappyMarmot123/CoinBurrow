<script setup lang="ts">
import { computed } from "vue";
import { Chart } from "highcharts-vue";
import type { Options } from "highcharts";
import { useCandleStore } from "../../stores/candle.js";

const candleStore = useCandleStore();
const chartOptions = computed<Options>(() => ({
  chart: { type: "candlestick", height: 400 },
  title: { text: "1분봉" },
  xAxis: { type: "datetime" },
  yAxis: { title: { text: null } },
  series: [
    {
      type: "candlestick",
      name: "Price",
      data: candleStore.candles.map((candle) => [
        candle.timestamp,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
      ]),
    },
  ],
}));
</script>

<template>
  <section class="chart">
    <Chart :options="chartOptions" />
  </section>
</template>

<style scoped>
.chart {
  min-width: 0;
}
</style>
