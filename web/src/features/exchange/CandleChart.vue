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

const volumeData = computed(() =>
  candleStore.candles.map((candle) => ({
    x: candle.timestamp,
    y: candle.volume,
    // 캔들 방향대로 색 구분(상승=up, 하락=down) — 거래소 표준 UX
    color: candle.close >= candle.open ? chartColors.value.up : chartColors.value.down,
  })),
);

const chartOptions = computed<Options>(() => ({
  chart: {
    height: 460,
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
  yAxis: [
    {
      // 가격 pane (상단)
      title: { text: null },
      height: "74%",
      top: "0%",
      lineWidth: 1,
      lineColor: chartColors.value.axis,
      gridLineColor: chartColors.value.grid,
      labels: { style: { color: chartColors.value.label } },
    },
    {
      // 거래량 pane (하단) — 그리드/라벨 최소화로 클러터 제거
      title: { text: null },
      top: "80%",
      height: "20%",
      offset: 0,
      gridLineWidth: 0,
      labels: { enabled: false },
    },
  ],
  plotOptions: {
    candlestick: {
      lineWidth: 1,
      upLineColor: chartColors.value.up,
      upColor: chartColors.value.up,
      color: chartColors.value.down,
      states: {
        hover: {
          lineWidth: 1.5,
        },
      },
    },
    column: {
      borderWidth: 0,
      maxPointWidth: 16,
      pointPadding: 0.1,
      groupPadding: 0.1,
    },
  },
  tooltip: {
    shared: true,
    split: false,
  },
  series: [
    {
      type: "candlestick",
      name: "가격",
      yAxis: 0,
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
    {
      type: "column",
      name: "거래량",
      yAxis: 1,
      opacity: 0.55,
      data: volumeData.value,
    },
  ],
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
    <p v-else class="chart-empty">차트 데이터가 없습니다.</p>
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
