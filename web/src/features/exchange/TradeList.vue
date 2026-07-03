<script setup lang="ts">
import { useTradeStore } from "../../stores/trade.js";
import { computed, ref, watch } from "vue";
import { getTradeSnapshot } from "../../api/rest.js";
import type { TradeView } from "../../stores/types.js";
import { formatNumber, formatTime } from "../../utils/format.js";

const props = defineProps<{
  market: string;
}>();

const tradeStore = useTradeStore();
const TRADE_DISPLAY_LIMIT = 10;

type TradeDayOption = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const selectedDay = ref<TradeDayOption>(0);
const historicalTrades = ref<TradeView[]>([]);
const loading = ref(false);
const error = ref("");
const trades = computed(() => {
  if (selectedDay.value === 0) {
    return tradeStore.recent.slice(0, TRADE_DISPLAY_LIMIT);
  }
  return historicalTrades.value.slice(0, TRADE_DISPLAY_LIMIT);
});
const dayOptions = computed(() =>
  Array.from({ length: 8 }, (_, daysAgo) => ({
    value: daysAgo as TradeDayOption,
    label: formatDayOption(daysAgo),
  })),
);

function sideLabel(side: "ASK" | "BID") {
  return side === "BID" ? "매수" : "매도";
}

function formatDayOption(daysAgo: number) {
  if (daysAgo === 0) return "오늘";
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

async function loadHistoricalTrades() {
  const daysAgo = selectedDay.value;
  if (daysAgo === 0) {
    historicalTrades.value = [];
    error.value = "";
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const snapshot = await getTradeSnapshot(props.market, {
      daysAgo,
      count: TRADE_DISPLAY_LIMIT,
    });
    if (selectedDay.value === daysAgo) {
      historicalTrades.value = snapshot;
    }
  } catch {
    if (selectedDay.value === daysAgo) {
      historicalTrades.value = [];
      error.value = "체결 내역을 불러오지 못했습니다.";
    }
  } finally {
    if (selectedDay.value === daysAgo) {
      loading.value = false;
    }
  }
}

watch(() => props.market, () => {
  selectedDay.value = 0;
  historicalTrades.value = [];
  error.value = "";
  loading.value = false;
});

watch(selectedDay, () => {
  void loadHistoricalTrades();
});
</script>

<template>
  <section class="trades">
    <div class="trades-head">
      <label class="trades-filter">
        <span>날짜</span>
        <select v-model.number="selectedDay" :disabled="loading">
          <option v-for="option in dayOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <p class="trades-head__count">{{ trades.length.toLocaleString() }}건</p>
    </div>
    <ul v-if="trades.length > 0">
      <li
        v-for="(trade, index) in trades"
        :key="`${trade.market}-${trade.timestamp}-${index}`"
        :class="trade.side === 'BID' ? 'up' : 'down'"
      >
        <span class="trades-indicator" aria-hidden="true"></span>
        <span class="trades-time">{{ formatTime(trade.timestamp) }}</span>
        <span class="trades-side">{{ sideLabel(trade.side) }}</span>
        <span class="trades-volume">{{ formatNumber(trade.volume) }}</span>
        <strong>{{ formatNumber(trade.price) }}</strong>
      </li>
    </ul>
    <p v-else-if="loading" class="trades-empty">체결 데이터를 불러오는 중입니다.</p>
    <p v-else-if="error" class="trades-empty">{{ error }}</p>
    <p v-else class="trades-empty">체결 데이터가 없습니다.</p>
  </section>
</template>

<style scoped lang="scss">
.trades-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.trades-filter {
  display: grid;
  gap: 5px;
  min-width: 96px;
}

.trades-filter span {
  @include muted-label;
}

.trades-filter select {
  @include select-control;
  padding: 7px 9px;
  padding-right: 34px;
  font-size: 12px;
}

.trades-head__count {
  margin: 0;
  @include muted-label;
}

ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-variant-numeric: tabular-nums;
}

li {
  display: grid;
  grid-template-columns: 4px minmax(54px, 0.75fr) minmax(34px, 0.5fr) minmax(70px, 1fr) minmax(80px, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 0;
  border-bottom: 1px solid var(--panel-line);
}

li:first-child {
  animation: trade-flash 0.42s ease-out;
}

.trades-indicator {
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: currentColor;
}

li > .trades-side,
li > .trades-time,
li > .trades-volume {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trades-time {
  min-width: 0;
}

.trades-side {
  min-width: 0;
}

.trades-volume {
  min-width: 0;
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
}

.up {
  color: var(--c-up);
}

.down {
  color: var(--c-down);
}

.up strong,
.down strong {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 13px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trades-empty {
  margin: 34px 0;
  text-align: center;
  color: var(--text-muted);
}

@keyframes trade-flash {
  from {
    background: var(--panel-bg-strong);
  }
  to {
    background: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  li:first-child {
    animation: none;
  }
}

@media (max-width: 640px) {
  li {
    grid-template-columns: 4px minmax(44px, 0.65fr) minmax(34px, 0.45fr) minmax(50px, 0.75fr) minmax(68px, 1fr);
    gap: 6px;
  }
}

@media (max-width: 520px) {
  .trades-head {
    align-items: stretch;
  }

  li {
    grid-template-columns: 4px minmax(42px, 0.6fr) minmax(32px, 0.42fr) minmax(46px, 0.7fr) minmax(64px, 1fr);
    gap: 5px;
  }
}
</style>
