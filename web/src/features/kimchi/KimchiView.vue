<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useKimchiStore } from "../../stores/kimchi.js";
import { useFxStore } from "../../stores/fx.js";
import { useMarketSocket } from "../../composables/useMarketSocket.js";
import { useBinanceSocket } from "../../composables/useBinanceSocket.js";
import KimchiTable from "./KimchiTable.vue";
import {
  selectKimchiRows,
  KIMCHI_SORT_OPTIONS,
  type KimchiSortMode,
} from "./kimchiSort.js";

const FX_POLL_MS = 30 * 60 * 1000;

const kimchi = useKimchiStore();
const fx = useFxStore();
const { loading, error, degraded } = storeToRefs(kimchi);
const rows = computed(() => kimchi.rows);

const sortOptions = KIMCHI_SORT_OPTIONS;
const sortMode = ref<KimchiSortMode>("top");
const displayRows = computed(() => selectKimchiRows(rows.value, sortMode.value));

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

      <section class="kimchi-view__explain" aria-label="김치 프리미엄 계산 방법">
        <p class="kimchi-view__formula">
          김프 % = (업비트 원화가 ÷ 바이낸스 원화환산가 − 1) × 100
        </p>
        <ul class="kimchi-view__notes">
          <li>바이낸스 원화환산가 = 바이낸스 USDT가 × USD/KRW 환율 <em>(USDT ≈ USD 근사)</em></li>
          <li><strong class="up">양수(+)</strong>면 국내가 더 비쌈(프리미엄), <strong class="down">음수(−)</strong>면 더 쌈(역프리미엄)</li>
        </ul>
      </section>

      <p v-if="fx.degraded || degraded" class="kimchi-view__banner">
        일부 데이터를 일시적으로 불러오지 못했습니다. 표시된 값이 지연될 수 있습니다.
      </p>

      <div class="kimchi-view__filter" role="group" aria-label="정렬 기준">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          type="button"
          class="kimchi-view__filter-btn"
          :class="{ 'is-active': sortMode === option.value }"
          :aria-pressed="sortMode === option.value"
          @click="sortMode = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <p v-if="loading && rows.length === 0" class="insights-state">불러오는 중…</p>
      <p v-else-if="error" class="insights-state insights-state--error">{{ error }}</p>
      <div v-else class="kimchi-view__scroll">
        <KimchiTable :rows="displayRows" />
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
.kimchi-view__explain {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  background: var(--panel-bg-strong);
  padding: 10px 12px;
  margin: 0 0 12px;
}
.kimchi-view__formula {
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: clamp(12px, 1.3vw, 14px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.kimchi-view__notes {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.kimchi-view__notes em {
  color: var(--text-dim);
  font-style: normal;
}
.kimchi-view__notes .up { color: var(--c-up); }
.kimchi-view__notes .down { color: var(--c-down); }
.kimchi-view__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 12px;
}
.kimchi-view__filter-btn {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: border-color var(--ease), color var(--ease), background var(--ease);
}
.kimchi-view__filter-btn:hover,
.kimchi-view__filter-btn:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  outline: none;
}
.kimchi-view__filter-btn.is-active {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: var(--panel-bg-strong);
}
.kimchi-view__scroll {
  max-height: clamp(320px, 48vh, 520px);
  overflow: auto;
  overscroll-behavior-x: contain;
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

@media (max-width: 640px) {
  .panel-sub {
    text-align: left;
  }

  .kimchi-view__filter-btn {
    flex: 1 1 96px;
    min-height: 36px;
  }

  .kimchi-view__scroll {
    max-height: clamp(300px, 52vh, 480px);
  }
}
</style>
