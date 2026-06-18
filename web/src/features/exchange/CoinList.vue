<script setup lang="ts">
import { computed, ref } from "vue";
import { useMarketStore } from "../../stores/market.js";

defineProps<{ selected: string }>();

const emit = defineEmits<{ select: [market: string] }>();
const marketStore = useMarketStore();
const query = ref("");

const filteredMarkets = computed(() => {
  const value = query.value.trim().toLowerCase();
  if (!value) return marketStore.list;
  return marketStore.list.filter(
    (market) =>
      market.koreanName.includes(query.value.trim()) ||
      market.englishName.toLowerCase().includes(value) ||
      market.market.toLowerCase().includes(value),
  );
});
</script>

<template>
  <aside class="coin-list">
    <input v-model="query" type="search" placeholder="코인 검색" />
    <ul>
      <li
        v-for="market in filteredMarkets"
        :key="market.market"
        :class="{ selected: market.market === selected }"
        @click="emit('select', market.market)"
      >
        <span>{{ market.koreanName }}</span>
        <small>{{ market.market }}</small>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.coin-list {
  display: flex;
  min-width: 220px;
  flex-direction: column;
  gap: 12px;
}

input {
  width: 100%;
  border: 1px solid #d7dde8;
  border-radius: 6px;
  padding: 10px 12px;
  font: inherit;
}

ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  cursor: pointer;
  justify-content: space-between;
  gap: 12px;
  border-radius: 6px;
  padding: 10px 12px;
}

li:hover,
li.selected {
  background: #eef3f8;
}

small {
  color: #667085;
}
</style>
