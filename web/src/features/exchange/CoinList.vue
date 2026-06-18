<script setup lang="ts">
import { computed, ref } from "vue";
import { useMarketStore } from "../../stores/market.js";

const props = defineProps<{ selected: string }>();

const emit = defineEmits<{ select: [market: string] }>();
const marketStore = useMarketStore();
const query = ref("");

const filteredMarkets = computed(() => {
  const value = query.value.trim().toLowerCase();
  if (!value) return marketStore.list;
  return marketStore.list.filter(
    (market) =>
      market.koreanName.toLowerCase().includes(value) ||
      market.englishName.toLowerCase().includes(value) ||
      market.market.toLowerCase().includes(value),
  );
});

const hasMarkets = computed(() => filteredMarkets.value.length > 0);
const visibleCount = computed(() => filteredMarkets.value.length);
const totalCount = computed(() => marketStore.list.length);
</script>

<template>
  <aside class="coin-list">
    <label class="coin-search">
      <input v-model="query" type="search" placeholder="코인 검색" aria-label="코인 검색" />
    </label>
    <p class="coin-meta">{{ visibleCount.toLocaleString() }} / {{ totalCount.toLocaleString() }}개</p>

    <ul v-if="hasMarkets" class="coin-list__rows" role="listbox" :aria-label="`검색 결과 ${visibleCount}개`">
      <li
        v-for="market in filteredMarkets"
        :key="market.market"
        :class="{ selected: market.market === props.selected }"
        class="coin-row"
        role="option"
        :aria-selected="market.market === props.selected"
        tabindex="0"
        @click="emit('select', market.market)"
        @keydown.enter.prevent="emit('select', market.market)"
        @keydown.space.prevent="emit('select', market.market)"
      >
        <div class="coin-main">
          <span class="coin-main__name">{{ market.koreanName }}</span>
          <small class="coin-main__code">{{ market.market }}</small>
        </div>
        <small class="coin-main__eng">{{ market.englishName }}</small>
      </li>
    </ul>

    <p v-else class="coin-empty">검색 결과가 없습니다.</p>
  </aside>
</template>

<style scoped>
.coin-list {
  display: flex;
  min-width: 220px;
  flex-direction: column;
  gap: 10px;
}

.coin-search {
  display: block;
  position: relative;
}

input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 10px 12px;
  color: #f2f0dd;
  background: rgba(0, 0, 0, 0.24);
  font-size: 14px;
  font-weight: 500;
}

input::placeholder {
  color: rgba(194, 207, 227, 0.68);
}

.coin-meta {
  margin: 0;
  color: #a7b3c5;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.coin-list__rows {
  min-height: 0;
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  max-height: min(70vh, 520px);
  overflow: auto;
  list-style: none;
}

.coin-row {
  cursor: pointer;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;
}

.coin-row:hover {
  transform: translateY(-1px);
  border-color: rgba(168, 209, 163, 0.48);
  background: rgba(255, 255, 255, 0.08);
}

.coin-row.selected {
  background: rgba(168, 209, 163, 0.18);
  border-color: rgba(168, 209, 163, 0.72);
}

.coin-main {
  display: grid;
  min-width: 0;
  grid-template-columns: 1fr;
  gap: 2px;
}

.coin-main__name {
  color: #f5f8ff;
  font-weight: 700;
}

.coin-main__code {
  color: #96a4be;
  font-size: 12px;
}

.coin-main__eng {
  margin-left: auto;
  color: #becbe2;
  font-size: 12px;
  white-space: nowrap;
}

.coin-empty {
  margin: 20px 0 0;
  color: #a8b4c9;
  font-size: 14px;
}
</style>
