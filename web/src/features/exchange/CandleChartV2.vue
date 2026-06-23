<script setup lang="ts">
import {
  computed,
  markRaw,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  HistogramSeries,
} from "lightweight-charts";
import {
  TF_SECONDS,
  formatAmount,
  readCssToken,
  tickFormatter,
  toCandlestickBar,
  toVolumeBar,
} from "./candleChartData.js";
import { useCandleStore } from "../../stores/candle.js";
import { useTradeStore } from "../../stores/trade.js";
import type { CandleTimeframe } from "../../api/rest.js";
import type { CandleView, TradeView } from "../../stores/types.js";
import { createTradingViewLogoGuard } from "./tradingViewLogoGuard.js";

const chartHeight = 460;
const xAxisReservedHeight = 18;
const chartCanvasHeight = chartHeight + xAxisReservedHeight;
const pricePanelMargins = { top: 0.2, bottom:0 };
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
const tradeStore = useTradeStore();
const container = ref<HTMLElement | null>(null);
// lightweight-charts 인스턴스는 Vue 반응형 프록시로 감싸지 않는다(shallowRef + markRaw).
const chart = shallowRef<IChartApi | null>(null);
const candleSeries = shallowRef<ISeriesApi<"Candlestick"> | null>(null);
const volumeSeries = shallowRef<ISeriesApi<"Histogram"> | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);
const hasCandles = computed(() => candleStore.candles.length > 0);
const { hideTradingViewLogoAfterMount, stopTradingViewLogoGuard } = createTradingViewLogoGuard(container);
let renderedSnapshot: CandleView[] = [];

const chartColors = computed(() => ({
  axis: readCssToken("--chart-axis", "rgba(255, 255, 255, 0.22)"),
  axisSoft: readCssToken("--chart-axis-soft", "rgba(255, 255, 255, 0.16)"),
  grid: readCssToken("--chart-grid", "rgba(255, 255, 255, 0.11)"),
  label: readCssToken("--text-muted", "#9fb0c6"),
  up: readCssToken("--c-up", "#9be15d"),
  down: readCssToken("--c-down", "#ffb02e"),
}));

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

function setFullData(candles: CandleView[]) {
  if (!candleSeries.value || !volumeSeries.value) {
    return;
  }
  candleSeries.value.setData(candles.map(toCandlestickBar));
  volumeSeries.value.setData(candles.map((candle) => toVolumeBar(candle, chartColors.value.up, chartColors.value.down)));
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
    volumeSeries.value.update(toVolumeBar(nextLast, chartColors.value.up, chartColors.value.down));
    renderedSnapshot = candles.map((item) => ({ ...item }));
    return;
  }

  if (delta === 1 && nextLast.timestamp > prevLast.timestamp) {
    candleSeries.value.update(toCandlestickBar(nextLast));
    volumeSeries.value.update(toVolumeBar(nextLast, chartColors.value.up, chartColors.value.down));
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

  chart.value = markRaw(
    createChart(container.value, {
      width: Math.max(Math.floor(container.value.clientWidth), 0),
      height: chartCanvasHeight,
      rightPriceScale: {
        visible: true,
        borderColor: chartColors.value.axis,
        scaleMargins: pricePanelMargins,
      },
      timeScale: {
        borderColor: chartColors.value.axis,
        timeVisible: true,
        secondsVisible: props.timeframe === "1s",
        tickMarkFormatter: tickFormatter,
      },
    }),
  );

  candleSeries.value = markRaw(
    chart.value.addSeries(CandlestickSeries, {
      upColor: chartColors.value.up,
      downColor: chartColors.value.down,
      borderUpColor: chartColors.value.up,
      borderDownColor: chartColors.value.down,
      wickUpColor: chartColors.value.up,
      wickDownColor: chartColors.value.down,
      borderVisible: false,
      // 현재가 라벨 + 현재가 라인 (lightweight-charts 기본 기능, 둘 다 기본 true이나 명시)
      lastValueVisible: true,
      priceLineVisible: true,
    }),
  );

  // 볼륨: 별도 pane(paneIndex 1)으로 분리 → 영역 구분 + 축 수치 표시
  volumeSeries.value = markRaw(
    chart.value.addSeries(
      HistogramSeries,
      {
        color: chartColors.value.up,
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      1,
    ),
  );

  // pane 비율(가격 75% / 볼륨 25%) + 볼륨 축 노출
  const panes = chart.value.panes();
  panes[0]?.setStretchFactor(3);
  panes[1]?.setStretchFactor(1);
  volumeSeries.value.priceScale().applyOptions({
    visible: true,
    borderColor: chartColors.value.axis,
    scaleMargins: { top: 0, bottom: 0 },
  });

  applyChartTheme();
  setFullData(candleStore.candles);
  observeResize();
  syncSize();
}

onMounted(() => {
  nextTick(() => {
    setupChart();
    hideTradingViewLogoAfterMount();
  });
});

onUnmounted(() => {
  if (liveRafId !== null && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(liveRafId);
  }
  liveRafId = null;
  pendingTick = null;
  stopTradingViewLogoGuard();
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

// 실시간 틱 오버레이: 체결(trade)마다 형성 중인 봉의 close/high/low를 갱신.
// store는 건드리지 않고 차트 로컬로만 반영 → candle WS가 권위값으로 reconcile.
let pendingTick: TradeView | null = null;
let liveRafId: number | null = null;

function applyLiveTick(trade: TradeView) {
  if (!candleSeries.value || trade.market !== props.market) return;
  if (renderedSnapshot.length === 0) return;

  const last = renderedSnapshot[renderedSnapshot.length - 1];
  const bucketSec = TF_SECONDS[props.timeframe] ?? 60;
  const lastTime = Math.floor(last.timestamp / 1000);
  const tickBucket = Math.floor(trade.timestamp / 1000 / bucketSec) * bucketSec;
  // 버킷 경계 가드: 다른(새) 버킷이면 틱으로 새 봉을 만들지 않고 candle WS를 기다림.
  if (tickBucket !== lastTime) return;

  const price = trade.price;
  candleSeries.value.update({
    time: lastTime as UTCTimestamp,
    open: last.open,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price),
    close: price,
  });
}

function flushLiveTick() {
  liveRafId = null;
  const trade = pendingTick;
  pendingTick = null;
  if (trade) applyLiveTick(trade);
}

watch(
  () => tradeStore.recent[0],
  (trade) => {
    if (!trade) return;
    pendingTick = trade;
    if (liveRafId !== null) return;
    if (typeof requestAnimationFrame === "undefined") {
      flushLiveTick();
      return;
    }
    liveRafId = requestAnimationFrame(flushLiveTick);
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
