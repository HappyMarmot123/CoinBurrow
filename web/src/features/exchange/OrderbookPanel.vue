<script setup lang="ts">
import { useOrderbookStore } from "../../stores/orderbook.js";
import { computed } from "vue";
import { formatNumber } from "../../utils/format.js";

const orderbookStore = useOrderbookStore();

const rows = computed(() => orderbookStore.current?.units ?? []);
</script>

<template>
  <section class="orderbook">
    <p v-if="rows.length > 0" class="orderbook__summary">
      {{ orderbookStore.current?.market }}
    </p>

    <table v-if="rows.length > 0">
      <thead>
        <tr>
          <th colspan="2">매도</th>
          <th colspan="2">매수</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(unit, index) in rows" :key="index">
          <td class="ask">{{ formatNumber(unit.askPrice) }}</td>
          <td class="ask">{{ formatNumber(unit.askSize) }}</td>
          <td class="bid">{{ formatNumber(unit.bidPrice) }}</td>
          <td class="bid">{{ formatNumber(unit.bidSize) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="orderbook__empty">호가 데이터를 기다리는 중입니다.</p>
  </section>
</template>

<style scoped lang="scss">
.orderbook {
  min-width: 0;
}

.orderbook__summary {
  margin: 0 0 10px;
  color: #a8b4c7;
  font-size: 12px;
  text-transform: uppercase;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-variant-numeric: tabular-nums;
}

thead th {
  color: #c1cee2;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 0 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

td {
  padding: 8px 2px;
  font-size: 13px;
}

.ask {
  color: #f97373;
  text-align: right;
}

.bid {
  color: #6cb5ff;
  text-align: right;
}

.orderbook__empty {
  margin: 34px 0;
  color: #95a7be;
  text-align: center;
}
</style>
