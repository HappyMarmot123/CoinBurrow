<script setup lang="ts">
import { useTradeStore } from "../../stores/trade.js";
import { computed } from "vue";
import { formatNumber, formatTime } from "../../utils/format.js";

const tradeStore = useTradeStore();
const trades = computed(() => tradeStore.recent.slice(0, 50));

function sideLabel(side: "ASK" | "BID") {
  return side === "BID" ? "매수" : "매도";
}
</script>

<template>
  <section class="trades">
    <div class="trades-head">
      <p class="trades-head__title">체결</p>
      <p class="trades-head__count">{{ trades.length.toLocaleString() }}건</p>
    </div>
    <ul v-if="trades.length > 0">
      <li
        v-for="(trade, index) in trades"
        :key="`${trade.market}-${trade.timestamp}-${index}`"
        :class="trade.side === 'BID' ? 'up' : 'down'"
      >
        <span class="trades-time">{{ formatTime(trade.timestamp) }}</span>
        <span class="trades-side">{{ sideLabel(trade.side) }}</span>
        <span class="trades-volume">{{ formatNumber(trade.volume) }}</span>
        <strong>{{ formatNumber(trade.price) }}</strong>
      </li>
    </ul>
    <p v-else class="trades-empty">체결 데이터가 없습니다.</p>
  </section>
</template>

<style scoped lang="scss">
.trades-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 10px;
}

.trades-head__title {
  margin: 0;
  color: #f6f8ff;
  font-size: 18px;
  font-weight: 700;
}

.trades-head__count {
  margin: 0;
  color: #9fb0c6;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-variant-numeric: tabular-nums;
}

li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

li > .trades-side,
li > .trades-time,
li > .trades-volume {
  font-size: 12px;
  color: #9ca8bc;
}

.trades-time {
  width: 46px;
}

.trades-side {
  width: 34px;
}

.trades-volume {
  margin-left: auto;
  width: 80px;
  text-align: right;
}

.up {
  color: #6cb5ff;
}

.down {
  color: #f97373;
}

.up strong,
.down strong {
  color: inherit;
  font-size: 13px;
}

.trades-empty {
  margin: 34px 0;
  text-align: center;
  color: #95a7be;
}
</style>
