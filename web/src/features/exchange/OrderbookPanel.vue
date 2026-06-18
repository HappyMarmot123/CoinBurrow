<script setup lang="ts">
import { useOrderbookStore } from "../../stores/orderbook.js";

const orderbookStore = useOrderbookStore();
</script>

<template>
  <section class="orderbook">
    <h2>호가</h2>
    <table v-if="orderbookStore.current">
      <tbody>
        <tr v-for="(unit, index) in orderbookStore.current.units" :key="index">
          <td class="ask">{{ unit.askPrice }} ({{ unit.askSize }})</td>
          <td class="bid">{{ unit.bidPrice }} ({{ unit.bidSize }})</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.orderbook {
  min-width: 0;
}

h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

td {
  border-top: 1px solid #e4e9f1;
  padding: 8px 10px;
}

.ask {
  color: #c43d4b;
}

.bid {
  color: #2368c4;
}
</style>
