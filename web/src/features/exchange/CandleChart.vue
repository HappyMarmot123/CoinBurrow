<script setup lang="ts">
import { computed } from "vue";
import { Chart } from "highcharts-vue";
import type { Options } from "highcharts";
import Highcharts from "highcharts";
import HighchartsMore from "highcharts/highcharts-more";
import Stock from "highcharts/modules/stock";
import { useCandleStore } from "../../stores/candle.js";
import type { CandleTimeframe } from "../../api/rest.js";

if (typeof HighchartsMore === "function") {
  HighchartsMore(Highcharts);
}
if (typeof Stock === "function") {
  Stock(Highcharts);
}

const candleStore = useCandleStore();
const props = withDefaults(
  defineProps<{
    timeframe?: CandleTimeframe;
  }>(),
  {
    timeframe: "1m",
  },
);
const hasCandles = computed(() => candleStore.candles.length > 0);

function readCssToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const chartColors = computed(() => ({
  axis: readCssToken("--chart-axis", "gray"),
  axisSoft: readCssToken("--chart-axis-soft", "gray"),
  grid: readCssToken("--chart-grid", "gray"),
  label: readCssToken("--text-muted", "silver"),
  up: readCssToken("--c-up", "limegreen"),
  down: readCssToken("--c-down", "orange"),
}));
const chartOptions = computed<Options>(() => ({
  chart: {
    type: "candlestick",
    height: 410,
    backgroundColor: "transparent",
    animation: false,
  },
  title: { text: "" },
  credits: { enabled: false },
  rangeSelector: { enabled: false },
  navigator: { enabled: false },
  scrollbar: { enabled: false },
  xAxis: {
    type: "datetime",
    tickColor: chartColors.value.axisSoft,
    lineColor: chartColors.value.axis,
    labels: { style: { color: chartColors.value.label } },
  },
  yAxis: {
    title: { text: null },
    gridLineColor: chartColors.value.grid,
    labels: { style: { color: chartColors.value.label } },
  },
  series: [
    {
      type: "candlestick",
      name: "KRW Price",
      color: chartColors.value.down,
      upColor: chartColors.value.up,
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
    <Chart
      v-if="hasCandles"
      :options="chartOptions"
      :highcharts="Highcharts"
      constructor-type="stockChart"
    />
    <p v-else class="chart-empty">캔들 데이터를 불러오는 중입니다.</p>
  </section>
</template>

<style scoped lang="scss">
.chart {
  min-width: 0;
}

.chart-empty {
  margin: 64px 0;
  text-align: center;
  color: var(--text-muted);
}
</style>
