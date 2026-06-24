<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useKimchiStore } from "../../stores/kimchi.js";
import { useFxStore } from "../../stores/fx.js";
import { useMarketSocket } from "../../composables/useMarketSocket.js";
import { useBinanceSocket } from "../../composables/useBinanceSocket.js";
import KimchiTable from "./KimchiTable.vue";

const FX_POLL_MS = 30 * 60 * 1000;

const kimchi = useKimchiStore();
const fx = useFxStore();
const { loading, error, degraded } = storeToRefs(kimchi);
const rows = computed(() => kimchi.rows);

const upbit = useMarketSocket();
const binance = useBinanceSocket();

let fxTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([kimchi.loadUniverse(), fx.load()]);
  if (kimchi.upbitMarkets.length > 0) {
    upbit.subscribe("ticker", kimchi.upbitMarkets);
    binance.subscribe(kimchi.binanceSymbols);
  }
  fxTimer = setInterval(() => { void fx.load(); }, FX_POLL_MS);
});

onUnmounted(() => {
  if (fxTimer) clearInterval(fxTimer);
});
</script>

<template>
  <div class="kimchi-view">
    <article class="panel">
      <div class="panel-head">
        <h2>김치 프리미엄</h2>
        <p class="panel-sub">업비트(KRW) vs 바이낸스(USDT) 실시간 가격 괴리율</p>
      </div>

      <p v-if="fx.degraded || degraded" class="kimchi-view__banner">
        일부 데이터를 일시적으로 불러오지 못했습니다. 표시된 값이 지연될 수 있습니다.
      </p>

      <p v-if="loading && rows.length === 0" class="insights-state">불러오는 중…</p>
      <p v-else-if="error" class="insights-state insights-state--error">{{ error }}</p>
      <div v-else class="kimchi-view__scroll">
        <KimchiTable :rows="rows" />
      </div>

      <footer class="kimchi-view__footer">
        USDT ≈ USD 근사로 환산했습니다. ·
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
          Rates By Exchange Rate API
        </a>
      </footer>
    </article>
  </div>
</template>

<style scoped lang="scss">
.kimchi-view {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
}
.panel { @include exchange-panel; padding: clamp(12px, 1.8vh, 18px); }
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
.kimchi-view__scroll {
  max-height: clamp(320px, 48vh, 520px);
  overflow-y: auto;
  @include thin-scrollbar;
}
.kimchi-view__banner {
  border: 1px solid var(--alert-border);
  background: var(--alert-bg);
  color: var(--alert-text);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  margin: 0 0 12px;
}
.kimchi-view__footer {
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 12px;
}
.kimchi-view__footer a { color: inherit; text-decoration: underline; }
.insights-state {
  margin: clamp(16px, 4vh, 40px) 0;
  text-align: center;
  color: var(--text-muted);
}
.insights-state--error { color: var(--alert-text); }
</style>
