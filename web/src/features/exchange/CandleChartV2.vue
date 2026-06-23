<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  HistogramSeries,
} from "lightweight-charts";
import { useCandleStore } from "../../stores/candle.js";
import type { CandleTimeframe } from "../../api/rest.js";
import type { CandleView } from "../../stores/types.js";

const chartHeight = 460;
const xAxisReservedHeight = 18;
const chartCanvasHeight = chartHeight + xAxisReservedHeight;
const pricePanelMargins = { top: 0.02, bottom: 0.3 };
const volumePanelMargins = { top: 0.78, bottom: 0 };
const VOLUME_PRICE_SCALE_ID = "volume";
const props = withDefaults(
  defineProps<{
    timeframe?: CandleTimeframe;
    market: string;
  }>(),
  {
    timeframe: "1m",
  },
);

const candleStore = useCandleStore();
const container = ref<HTMLElement | null>(null);
const chart = ref<IChartApi | null>(null);
const candleSeries = ref<ISeriesApi<"Candlestick"> | null>(null);
const volumeSeries = ref<ISeriesApi<"Histogram"> | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);
const hasCandles = computed(() => candleStore.candles.length > 0);
let renderedSnapshot: CandleView[] = [];

function readCssToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const chartColors = computed(() => ({
  axis: readCssToken("--chart-axis", "rgba(255, 255, 255, 0.22)"),
  axisSoft: readCssToken("--chart-axis-soft", "rgba(255, 255, 255, 0.16)"),
  grid: readCssToken("--chart-grid", "rgba(255, 255, 255, 0.11)"),
  label: readCssToken("--text-muted", "#9fb0c6"),
  up: readCssToken("--c-up", "#9be15d"),
  down: readCssToken("--c-down", "#ffb02e"),
}));

function toCandlestickBar(candle: CandleView): CandlestickData {
  return {
    time: Math.floor(candle.timestamp / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

function toVolumeBar(candle: CandleView): HistogramData {
  return {
    time: Math.floor(candle.timestamp / 1000) as UTCTimestamp,
    value: candle.volume,
    color: candle.close >= candle.open ? chartColors.value.up : chartColors.value.down,
  };
}

function formatKstLabel(time: UTCTimestamp): string {
  const kstOffsetSeconds = 9 * 60 * 60;
  const asUtc = new Date((Number(time) + kstOffsetSeconds) * 1000);
  const day = String(asUtc.getUTCMonth() + 1).padStart(2, "0");
  const hours = String(asUtc.getUTCHours()).padStart(2, "0");
  const minutes = String(asUtc.getUTCMinutes()).padStart(2, "0");
  return `${day} ${hours}:${minutes}`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
}

const tickFormatter = (rawTime: number): string => formatKstLabel(rawTime as UTCTimestamp);

function applyChartTheme() {
  if (!chart.value) return;

  chart.value.applyOptions({
    layout: {
      background: { color: "transparent" },
      textColor: chartColors.value.label,
    },
    grid: {
      vertLines: { color: chartColors.value.axisSoft },
      horzLines: { color: chartColors.value.axisSoft },
    },
    crosshair: {
      mode: 1,
      vertLine: { color: chartColors.value.axis },
      horzLine: { color: chartColors.value.axis },
    },
    rightPriceScale: {
      borderColor: chartColors.value.axis,
      scaleMargins: pricePanelMargins,
    },
    timeScale: {
      borderColor: chartColors.value.axis,
      timeVisible: true,
      secondsVisible: props.timeframe === "1s",
      tickMarkFormatter: tickFormatter,
    },
    localization: {
      timeFormatter: tickFormatter as (time: number | string) => string,
      priceFormatter: (price: number) => formatAmount(price),
    },
  });
}

function applyVolumePanelOptions() {
  if (!volumeSeries.value) return;
  const volumePriceScale = volumeSeries.value.priceScale();
  volumePriceScale.applyOptions({
    visible: false,
    scaleMargins: volumePanelMargins,
  });

  chart.value?.priceScale(VOLUME_PRICE_SCALE_ID).applyOptions({
    visible: false,
  });
}

function setFullData(candles: CandleView[]) {
  if (!candleSeries.value || !volumeSeries.value) {
    return;
  }
  candleSeries.value.setData(candles.map(toCandlestickBar));
  volumeSeries.value.setData(candles.map(toVolumeBar));
  applyVolumePanelOptions();
  chart.value?.timeScale().fitContent();
  renderedSnapshot = candles.map((item) => ({ ...item }));
}

function applyCandleUpdate(candles: CandleView[]) {
  if (!candles.length || !candleSeries.value || !volumeSeries.value || !chart.value) {
    setFullData(candles);
    return;
  }

  const prev = renderedSnapshot;

  if (!prev.length) {
    setFullData(candles);
    return;
  }

  const prevLength = prev.length;
  const nextLength = candles.length;
  const nextLast = candles[nextLength - 1];
  const prevLast = prev[prevLength - 1];

  if (!nextLast || !prevLast) {
    setFullData(candles);
    return;
  }

  const delta = nextLength - prevLength;
  if (delta === 0 && nextLast.timestamp === prevLast.timestamp) {
    candleSeries.value.update(toCandlestickBar(nextLast));
    volumeSeries.value.update(toVolumeBar(nextLast));
    renderedSnapshot = candles.map((item) => ({ ...item }));
    return;
  }

  if (delta === 1 && nextLast.timestamp > prevLast.timestamp) {
    candleSeries.value.update(toCandlestickBar(nextLast));
    volumeSeries.value.update(toVolumeBar(nextLast));
    renderedSnapshot = candles.map((item) => ({ ...item }));
    return;
  }

  setFullData(candles);
}

function syncFromStore(candles: CandleView[]) {
  if (!chart.value || !candleSeries.value || !volumeSeries.value) {
    return;
  }

  if (candles.length === 0) {
    renderedSnapshot = [];
    setFullData([]);
    return;
  }

  applyCandleUpdate(candles);
}

function syncSize() {
  if (!chart.value || !container.value) return;
  const width = Math.max(Math.floor(container.value.clientWidth), 0);
  if (width === 0) return;
  chart.value.resize(width, chartCanvasHeight);
}

function observeResize() {
  if (typeof ResizeObserver === "undefined" || !container.value) return;
  resizeObserver.value = new ResizeObserver(() => {
    syncSize();
  });
  resizeObserver.value.observe(container.value);
}

function setupChart() {
  if (!container.value) return;

  chart.value = createChart(container.value, {
    width: Math.max(Math.floor(container.value.clientWidth), 0),
    height: chartCanvasHeight,
    rightPriceScale: {
      borderColor: chartColors.value.axis,
      scaleMargins: pricePanelMargins,
    },
    timeScale: {
      borderColor: chartColors.value.axis,
      timeVisible: true,
      secondsVisible: props.timeframe === "1s",
      tickMarkFormatter: tickFormatter,
    },
  });

  candleSeries.value = chart.value.addSeries(CandlestickSeries, {
    upColor: chartColors.value.up,
    downColor: chartColors.value.down,
    borderUpColor: chartColors.value.up,
    borderDownColor: chartColors.value.down,
    wickUpColor: chartColors.value.up,
    wickDownColor: chartColors.value.down,
    borderVisible: false,
  });

  volumeSeries.value = chart.value.addSeries(HistogramSeries, {
    priceScaleId: VOLUME_PRICE_SCALE_ID,
    color: chartColors.value.up,
    lastValueVisible: false,
    priceLineVisible: false,
  });

  applyChartTheme();
  setFullData(candleStore.candles);
  observeResize();
  syncSize();
}

onMounted(() => {
  nextTick(() => {
    setupChart();
  });
});

onUnmounted(() => {
  resizeObserver.value?.disconnect();
  chart.value?.remove();
  chart.value = null;
  candleSeries.value = null;
  volumeSeries.value = null;
});

watch(
  () => chartColors.value,
  () => {
    applyChartTheme();
  },
  { deep: true },
);

watch(
  () => candleStore.candles,
  (candles) => syncFromStore(candles),
  { deep: true },
);

watch(
  () => props.timeframe,
  () => {
    chart.value?.applyOptions({
      timeScale: {
        secondsVisible: props.timeframe === "1s",
      },
    });
  },
);
</script>

<template>
  <section class="chart">
    <div ref="container" class="chart-canvas" />
    <p v-if="!hasCandles" class="chart-empty">차트 데이터가 없습니다.</p>
  </section>
</template>

<style scoped lang="scss">
.chart {
  min-width: 0;
  position: relative;
}

.chart-canvas {
  width: 100%;
  height: v-bind(chartCanvasHeight + "px");
}

.chart-empty {
  text-align: center;
  color: var(--text-muted);
  margin: 64px 0;
}

</style>
