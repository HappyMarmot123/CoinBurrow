<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useGlobalStore } from "../../stores/global.js";
import { formatCompact, formatNumber } from "../../utils/format.js";

const REFRESH_INTERVAL_MS = 60_000;

const store = useGlobalStore();
let pollTimer: number | undefined;

onMounted(() => {
  void store.load();
  pollTimer = window.setInterval(() => {
    if (store.loading) return;
    void store.load();
  }, REFRESH_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer);
});

const current = computed(() => store.current);
const hasData = computed(() => typeof current.value?.totalMarketCapUsd === "number");

function usd(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return `$${formatCompact(value)}`;
}
function pct(value: number | null | undefined, digits = 1): string {
  if (typeof value !== "number") return "-";
  return `${value.toFixed(digits)}%`;
}
function signedPct(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
function intOrDash(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return formatNumber(value);
}

const changeClass = computed(() => {
  const v = current.value?.marketCapChangePct24h;
  if (typeof v !== "number" || v === 0) return "flat";
  return v > 0 ? "up" : "down";
});

const cards = computed(() => {
  const c = current.value;
  if (!c) return [];
  return [
    { key: "volume", label: "24h 거래량", value: usd(c.totalVolumeUsd) },
    { key: "btc", label: "BTC 도미넌스", value: pct(c.btcDominance) },
    { key: "eth", label: "ETH 도미넌스", value: pct(c.ethDominance) },
    { key: "coins", label: "활성 암호화폐", value: intOrDash(c.activeCryptocurrencies) },
    { key: "markets", label: "거래소 수", value: intOrDash(c.markets) },
  ];
});
</script>

<template>
  <div class="global-view">
    <p v-if="store.loading && !current" class="insights-state">불러오는 중…</p>
    <p v-else-if="store.error" class="insights-state insights-state--error">{{ store.error }}</p>
    <p v-else-if="current?.degraded" class="insights-state insights-state--error">
      글로벌 시장 데이터를 일시적으로 가져올 수 없습니다. (사유: {{ current.degradedReason }})
    </p>

    <template v-if="hasData">
      <article class="panel panel-hero">
        <div class="panel-head">
          <h2>총 시가총액</h2>
          <p class="panel-sub">Total Crypto Market Cap (USD)</p>
        </div>
        <div class="hero-readout">
          <strong>{{ usd(current?.totalMarketCapUsd) }}</strong>
          <span class="hero-change" :class="changeClass">{{ signedPct(current?.marketCapChangePct24h) }} (24h)</span>
        </div>
      </article>

      <section class="grid">
        <article v-for="card in cards" :key="card.key" class="panel panel-stat">
          <span class="stat-label">{{ card.label }}</span>
          <span class="stat-value">{{ card.value }}</span>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.global-view {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
}
.panel {
  @include exchange-panel;
  padding: clamp(12px, 1.8vh, 18px);
}
.panel-head { @include panel-head; }
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
.hero-readout {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: clamp(6px, 1.4vh, 12px);
}
.hero-readout strong {
  font-size: clamp(34px, 6vw, 56px);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.hero-change {
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 800;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: clamp(10px, 1.4vw, 14px);
}
.panel-stat { display: flex; flex-direction: column; gap: 8px; }
.stat-label {
  color: var(--text-muted);
  font-size: clamp(12px, 1.2vw, 13px);
  font-weight: 700;
}
.stat-value {
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.up { color: var(--c-up); }
.down { color: var(--c-down); }
.flat { color: var(--c-flat); }
.insights-state {
  margin: clamp(16px, 4vh, 40px) 0;
  text-align: center;
  color: var(--text-muted);
}
.insights-state--error { color: var(--alert-text); }
</style>
