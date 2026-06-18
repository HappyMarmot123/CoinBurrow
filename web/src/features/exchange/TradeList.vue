<script setup lang="ts">
import { useTradeStore } from "../../stores/trade.js";

const tradeStore = useTradeStore();
</script>

<template>
  <section class="trades">
    <h2>체결</h2>
    <ul>
      <li v-for="trade in tradeStore.recent" :key="trade.timestamp" :class="trade.side === 'BID' ? 'up' : 'down'">
        <span>{{ trade.price }}</span>
        <small>{{ trade.volume }}</small>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-variant-numeric: tabular-nums;
}

li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e4e9f1;
  padding: 8px 0;
}

.up {
  color: #2368c4;
}

.down {
  color: #c43d4b;
}

small {
  color: #667085;
}
</style>
