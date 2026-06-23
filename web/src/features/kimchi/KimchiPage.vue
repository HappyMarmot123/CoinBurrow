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

  fxTimer = setInterval(() => {
    void fx.load();
  }, FX_POLL_MS);
});

onUnmounted(() => {
  if (fxTimer) clearInterval(fxTimer);
});
</script>

<template>
  <section class="kimchi-page">
    <header class="kimchi-page__head">
      <h1>김치 프리미엄</h1>
      <p class="kimchi-page__subtitle">업비트(KRW) vs 바이낸스(USDT) 실시간 가격 괴리율</p>
    </header>

    <p v-if="fx.degraded || degraded" class="kimchi-page__banner">
      일부 데이터를 일시적으로 불러오지 못했습니다. 표시된 값이 지연될 수 있습니다.
    </p>

    <p v-if="loading && rows.length === 0">불러오는 중…</p>
    <p v-else-if="error">{{ error }}</p>
    <KimchiTable v-else :rows="rows" />

    <footer class="kimchi-page__footer">
      USDT ≈ USD 근사로 환산했습니다. ·
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
        Rates By Exchange Rate API
      </a>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.kimchi-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.kimchi-page__subtitle {
  color: var(--text-muted);
  font-size: 13px;
}
.kimchi-page__banner {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.kimchi-page__footer {
  color: var(--text-muted);
  font-size: 11px;
}
.kimchi-page__footer a {
  color: inherit;
  text-decoration: underline;
}
</style>
