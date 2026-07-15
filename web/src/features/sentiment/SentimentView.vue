<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Chart } from "highcharts-vue";
import Highcharts from "highcharts";
import type { Options } from "highcharts";
import { useSentimentStore } from "../../stores/sentiment.js";
import type { SentimentLabel } from "../../api/rest.js";

const store = useSentimentStore();
const days = ref(30);
const dayOptions = [
  { value: 7, label: "7일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
];

// 추세 차트 높이를 컨테이너(남는 공간)에 맞춰 반응형으로 산출.
const trendBodyRef = ref<HTMLElement | null>(null);
const chartHeight = ref(220);
let trendResizeObserver: ResizeObserver | undefined;

watch(trendBodyRef, (el) => {
  trendResizeObserver?.disconnect();
  if (el && typeof ResizeObserver !== "undefined") {
    trendResizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      if (height > 0) chartHeight.value = Math.round(height);
    });
    trendResizeObserver.observe(el);
  }
});

onMounted(() => { void store.load(days.value); });

onBeforeUnmount(() => { trendResizeObserver?.disconnect(); });

watch(days, (next) => {
  void store.load(next);
});

const current = computed(() => store.current);
const hasData = computed(() => typeof current.value?.value === "number");
const history = computed(() => current.value?.history ?? []);

const CLASSIFICATION_KO: Record<string, string> = {
  "Extreme Fear": "극단적 공포",
  Fear: "공포",
  Neutral: "중립",
  Greed: "탐욕",
  "Extreme Greed": "극단적 탐욕",
};

const LABEL_KO: Record<SentimentLabel, string> = {
  positive: "긍정",
  negative: "부정",
  neutral: "중립",
};

function labelOf(value: number): SentimentLabel {
  if (value <= 44) return "negative";
  if (value <= 54) return "neutral";
  return "positive";
}

const classificationKo = computed(() => {
  const raw = current.value?.classification;
  if (!raw) return "-";
  return CLASSIFICATION_KO[raw] ?? raw;
});

const labelKo = computed(() => {
  const label = current.value?.label;
  return label ? LABEL_KO[label] : "-";
});

function readCssToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// Now / Yesterday / Last week / Last month 스냅샷 — history(오름차순)에서 인덱싱만.
interface SnapshotRow {
  key: string;
  label: string;
  value: number | null;
  t: number | null;
}

const shortDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
});

function formatShortDate(t: number | null): string {
  if (t === null) return "";
  return shortDateFormatter.format(t);
}

const snapshots = computed<SnapshotRow[]>(() => {
  const series = history.value;
  if (series.length === 0) return [];
  const last = series.length - 1;
  const at = (daysAgo: number) => series[last - daysAgo] ?? null;
  const row = (key: string, label: string, daysAgo: number): SnapshotRow => {
    const point = at(daysAgo);
    return { key, label, value: point?.value ?? null, t: point?.t ?? null };
  };
  return [
    row("now", "지금", 0),
    row("yesterday", "어제", 1),
    row("lastWeek", "지난주", 7),
    row("lastMonth", "지난달", 30),
  ];
});

const nowValue = computed(() => current.value?.value ?? null);

function deltaVsNow(value: number | null): number | null {
  if (value === null || nowValue.value === null) return null;
  return nowValue.value - value;
}

function labelClass(value: number | null): string {
  if (value === null) return "flat";
  const label = labelOf(value);
  return label === "positive" ? "up" : label === "negative" ? "down" : "flat";
}

// 반원(반달) 게이지 — 추가 차트 라이브러리 없이 SVG로 직접 그린다.
const GAUGE = { cx: 110, cy: 110, r: 88 };

function pointOnArc(frac: number, radius = GAUGE.r) {
  const angle = Math.PI * (1 - frac); // 0 → 좌측(π), 1 → 우측(0)
  return {
    x: GAUGE.cx + radius * Math.cos(angle),
    y: GAUGE.cy - radius * Math.sin(angle),
  };
}

function arcPath(from: number, to: number): string {
  const steps = Math.max(2, Math.round(to - from));
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const v = from + ((to - from) * i) / steps;
    const point = pointOnArc(v / 100);
    d += `${i === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
  }
  return d.trim();
}

// 공포 → 탐욕 5구간 색 (down-strong → down → flat → up → brand-lime)
const gaugeZones = [
  { from: 0, to: 25, color: "var(--c-down-strong)" },
  { from: 25, to: 45, color: "var(--c-down)" },
  { from: 45, to: 55, color: "var(--c-flat)" },
  { from: 55, to: 75, color: "var(--c-up)" },
  { from: 75, to: 100, color: "var(--brand-lime)" },
].map((zone) => ({ ...zone, d: arcPath(zone.from, zone.to) }));

const needle = computed(() => {
  const v = Math.min(100, Math.max(0, nowValue.value ?? 0));
  return pointOnArc(v / 100, GAUGE.r - 10);
});

const trendOptions = computed<Options>(() => {
  const axis = readCssToken("--chart-axis", "gray");
  const axisSoft = readCssToken("--chart-axis-soft", "gray");
  const grid = readCssToken("--chart-grid", "gray");
  const labelColor = readCssToken("--text-muted", "silver");
  const up = readCssToken("--c-up", "limegreen");
  const downBg = readCssToken("--c-down-bg", "rgba(255,176,46,0.14)");
  const upBg = readCssToken("--c-up-bg", "rgba(155,225,93,0.14)");

  // 데이터 범위에 맞춰 y축을 좁혀(0~100 안에서) 차트가 공간을 채우도록.
  const values = history.value.map((point) => point.value);
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 100;
  const yMin = Math.max(0, Math.floor((dataMin - 8) / 5) * 5);
  const yMax = Math.min(100, Math.ceil((dataMax + 8) / 5) * 5);

  return {
    chart: {
      type: "areaspline",
      height: chartHeight.value,
      backgroundColor: "transparent",
      animation: false,
    },
    title: { text: "" },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      type: "datetime",
      lineColor: axis,
      tickColor: axisSoft,
      labels: { style: { color: labelColor } },
    },
    yAxis: {
      min: yMin,
      max: yMax,
      title: { text: null },
      gridLineColor: grid,
      labels: { style: { color: labelColor } },
      plotBands: [
        { from: 0, to: 45, color: downBg },
        { from: 55, to: 100, color: upBg },
      ],
    },
    tooltip: {
      backgroundColor: "rgba(17,24,39,0.92)",
      borderWidth: 0,
      style: { color: "#f2f0dd" },
      xDateFormat: "%Y-%m-%d",
      pointFormat: "공포·탐욕 지수: <b>{point.y}</b>",
    },
    series: [
      {
        type: "areaspline",
        name: "Fear & Greed",
        data: history.value.map((point) => [point.t, point.value]),
        color: up,
        lineWidth: 2,
        fillOpacity: 0.22,
        marker: { enabled: false },
      },
    ],
  };
});
</script>

<template>
  <div class="sentiment-view">
    <p v-if="store.loading && !current" class="sentiment-state">불러오는 중…</p>
    <p v-else-if="store.error" class="sentiment-state sentiment-state--error">
      {{ store.error }}
    </p>
    <p v-else-if="current?.degraded" class="sentiment-state sentiment-state--error">
      감성 데이터를 일시적으로 가져올 수 없습니다. (사유: {{ current.degradedReason }})
    </p>

    <template v-if="hasData">
      <section class="grid">
        <!-- 현재 지수 -->
        <article class="panel panel-now">
          <div class="panel-head">
            <h2>현재 지수</h2>
            <p class="panel-sub">Crypto Fear &amp; Greed Index</p>
          </div>
          <div class="gauge" :class="labelClass(nowValue)">
            <svg
              class="gauge-svg"
              viewBox="0 0 220 120"
              role="img"
              :aria-label="`공포·탐욕 지수 ${nowValue}, ${classificationKo}`"
            >
              <path
                v-for="zone in gaugeZones"
                :key="zone.from"
                class="gauge-zone"
                :d="zone.d"
                :style="{ stroke: zone.color }"
              />
              <line
                class="gauge-needle"
                x1="110"
                y1="110"
                :x2="needle.x"
                :y2="needle.y"
              />
              <circle class="gauge-hub" cx="110" cy="110" r="8" />
            </svg>
            <div class="gauge-ends">
              <span>공포</span>
              <span>탐욕</span>
            </div>
            <div class="gauge-readout">
              <strong>{{ nowValue }}</strong>
              <div class="gauge-meta">
                <span class="now-classification">{{ classificationKo }}</span>
                <span class="now-chip" :class="labelClass(nowValue)">{{ labelKo }}</span>
              </div>
            </div>
          </div>
        </article>

        <!-- Historical Values -->
        <article class="panel panel-history">
          <div class="panel-head"><h2>Historical Values</h2></div>
          <ul class="history-list">
            <li v-for="row in snapshots" :key="row.key">
              <span class="history-label">
                <span class="history-label__name">{{ row.label }}</span>
                <small v-if="row.t !== null" class="history-date">{{ formatShortDate(row.t) }}</small>
              </span>
              <span v-if="row.value !== null" class="history-value" :class="labelClass(row.value)">
                {{ row.value }}
              </span>
              <span v-else class="history-value flat">—</span>
              <span
                v-if="deltaVsNow(row.value) !== null && row.key !== 'now'"
                class="history-delta"
                :class="(deltaVsNow(row.value) ?? 0) >= 0 ? 'up' : 'down'"
              >
                {{ (deltaVsNow(row.value) ?? 0) >= 0 ? "▲" : "▼" }}
                {{ Math.abs(deltaVsNow(row.value) ?? 0) }}
              </span>
            </li>
          </ul>
        </article>
      </section>

      <!-- 추세 -->
      <article class="panel panel-trend">
        <div class="panel-head">
          <h2>추세</h2>
          <div class="trend-range" role="group" aria-label="기간 선택">
            <button
              v-for="option in dayOptions"
              :key="option.value"
              type="button"
              :class="{ active: days === option.value }"
              @click="days = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div ref="trendBodyRef" class="trend-body">
          <div v-if="history.length > 0" class="trend-chart">
            <Chart
              :options="trendOptions"
              :highcharts="Highcharts"
            />
          </div>
          <p v-else class="sentiment-state">추세 데이터가 없습니다.</p>
        </div>
      </article>
    </template>
  </div>
</template>

<style scoped lang="scss">
.sentiment-view {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.4vh, 14px);
  overflow: hidden;
}

.sentiment-state {
  margin: clamp(16px, 4vh, 40px) 0;
  text-align: center;
  color: var(--text-muted);
}

.sentiment-state--error {
  color: var(--alert-text);
}

.grid {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: clamp(10px, 1.4vw, 14px);
}

.panel {
  @include exchange-panel;
  padding: clamp(12px, 1.8vh, 18px);
  overflow: hidden;
}

.panel-head {
  @include panel-head;
}

.panel-head h2 {
  @include panel-title(18px);
  font-size: clamp(15px, 1.8vw, 18px);
}

.panel-sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.2vw, 13px);
  text-align: right;
}

.panel-now,
.panel-history {
  display: flex;
  flex-direction: column;
}

.now-classification {
  font-size: clamp(14px, 1.6vw, 18px);
  font-weight: 800;
  color: var(--text-subtle);
}

.now-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 850;
}

.now-chip.up {
  color: var(--c-up);
  background: var(--c-up-bg);
}

.now-chip.down {
  color: var(--c-down);
  background: var(--c-down-bg);
}

.now-chip.flat {
  color: var(--c-flat);
  background: rgba(159, 176, 198, 0.14);
}

.gauge {
  position: relative;
  width: 100%;
  max-width: clamp(220px, 30vh, 300px);
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.gauge-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.gauge-zone {
  fill: none;
  stroke-width: 14;
  stroke-linecap: round;
}

.gauge-needle {
  stroke: var(--text-strong);
  stroke-width: 3;
  stroke-linecap: round;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  transition:
    x2 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    y2 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.gauge-hub {
  fill: var(--text-strong);
  stroke: var(--panel-bg-strong);
  stroke-width: 3;
}

.gauge-ends {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  padding: 0 6px;
  @include muted-label;
}

.gauge-readout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 0.8vh, 8px);
  margin-top: clamp(6px, 1.4vh, 12px);
}

.gauge-readout strong {
  font-size: clamp(40px, 8vh, 68px);
  font-weight: 900;
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
}

.gauge-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gauge.up .gauge-readout strong {
  color: var(--c-up);
}

.gauge.down .gauge-readout strong {
  color: var(--c-down);
}

.gauge.flat .gauge-readout strong {
  color: var(--c-flat);
}


.history-list {
  flex: 1;
  display: grid;
  grid-auto-rows: 1fr;
  margin: clamp(6px, 1vh, 10px) 0 0;
  padding: 0;
  list-style: none;
  font-variant-numeric: tabular-nums;
}

.history-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: clamp(7px, 1.3vh, 12px) 0;
  border-bottom: 1px solid var(--panel-line);
}

.history-list li:last-child {
  border-bottom: none;
}

.history-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.history-label__name {
  color: var(--text);
  font-size: clamp(13px, 1.4vw, 14px);
  font-weight: 700;
}

.history-date {
  color: var(--text-dim);
  font-size: 11px;
}

.history-value {
  font-size: clamp(15px, 1.6vw, 18px);
  font-weight: 850;
  text-align: right;
}

.history-delta {
  font-size: 12px;
  font-weight: 800;
  min-width: 48px;
  text-align: right;
}

.panel-trend {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-trend .panel-head {
  flex: 0 0 auto;
}

.trend-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.trend-chart {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.trend-chart :deep(.highcharts-container) {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden !important;
}

.trend-chart :deep(.highcharts-container svg) {
  width: 100% !important;
  max-width: 100% !important;
}

.trend-range {
  display: flex;
  gap: 6px;
}

.trend-range button {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: clamp(5px, 0.8vh, 6px) 12px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  transition: border-color var(--ease), color var(--ease), background var(--ease);
}

.trend-range button:hover,
.trend-range button.active {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: var(--panel-bg-strong);
}

.up {
  color: var(--c-up);
}

.down {
  color: var(--c-down);
}

.flat {
  color: var(--c-flat);
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
