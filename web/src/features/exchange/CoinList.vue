<script setup lang="ts">
import { computed, ref } from "vue";
import { useMarketStore } from "../../stores/market.js";
import { useTickerStore } from "../../stores/ticker.js";
import type { MarketView, TickerView } from "../../stores/types.js";
import { formatCompact, formatPrice } from "../../utils/format.js";

const props = defineProps<{ selected: string; quote?: string }>();

const emit = defineEmits<{
  select: [market: string];
}>();
const marketStore = useMarketStore();
const tickerStore = useTickerStore();
const query = ref("");
const sortKey = ref<"volume" | "price" | "change">("volume");

interface MarketRow {
  market: MarketView;
  ticker?: TickerView;
}

const filteredMarkets = computed(() => {
  const value = query.value.trim().toLowerCase();
  const list = value
    ? marketStore.list.filter(
    (market) =>
      market.koreanName.toLowerCase().includes(value) ||
      market.englishName.toLowerCase().includes(value) ||
      market.market.toLowerCase().includes(value),
      )
    : marketStore.list;

  return list
    .map<MarketRow>((market) => ({
      market,
      ticker: tickerStore.byMarket[market.market],
    }))
    .sort((a, b) => {
      if (sortKey.value === "price") {
        return (b.ticker?.tradePrice ?? Number.NEGATIVE_INFINITY) - (a.ticker?.tradePrice ?? Number.NEGATIVE_INFINITY);
      }
      if (sortKey.value === "change") {
        return (b.ticker?.signedChangeRate ?? Number.NEGATIVE_INFINITY) - (a.ticker?.signedChangeRate ?? Number.NEGATIVE_INFINITY);
      }
      return (b.ticker?.accTradePrice24h ?? Number.NEGATIVE_INFINITY) - (a.ticker?.accTradePrice24h ?? Number.NEGATIVE_INFINITY);
    });
});

const hasMarkets = computed(() => filteredMarkets.value.length > 0);
const visibleCount = computed(() => filteredMarkets.value.length);
const totalCount = computed(() => marketStore.list.length);

function assetCode(marketCode: string) {
  return marketCode.split("-").at(-1) ?? marketCode;
}

function movementClass(ticker?: TickerView) {
  const rate = ticker?.signedChangeRate ?? 0;
  if (rate > 0) return "is-up";
  if (rate < 0) return "is-down";
  return "is-flat";
}

function formatSignedRate(ticker?: TickerView) {
  if (!ticker) return "-";
  const sign = ticker.signedChangeRate > 0 ? "+" : "";
  return `${sign}${(ticker.signedChangeRate * 100).toFixed(2)}%`;
}

</script>

<template>
  <aside class="coin-list">
    <label class="coin-search">
      <input v-model="query" type="search" placeholder="코인 검색" aria-label="코인 검색" />
    </label>
    <div class="coin-tools">
      <p class="coin-meta">{{ visibleCount.toLocaleString() }} / {{ totalCount.toLocaleString() }}개</p>
      <div class="sort-tabs" role="group" aria-label="코인 정렬">
        <button :class="{ active: sortKey === 'volume' }" type="button" @click="sortKey = 'volume'">거래대금</button>
        <button :class="{ active: sortKey === 'price' }" type="button" @click="sortKey = 'price'">현재가</button>
        <button :class="{ active: sortKey === 'change' }" type="button" @click="sortKey = 'change'">등락률</button>
      </div>
    </div>

    <ul v-if="hasMarkets" class="coin-list__rows" role="listbox" :aria-label="`검색 결과 ${visibleCount}개`">
      <li
        v-for="row in filteredMarkets"
        :key="row.market.market"
        :class="[{ selected: row.market.market === props.selected }, movementClass(row.ticker)]"
        class="coin-row"
        role="option"
        :aria-selected="row.market.market === props.selected"
        tabindex="0"
        @click="emit('select', row.market.market)"
        @keydown.enter.prevent="emit('select', row.market.market)"
        @keydown.space.prevent="emit('select', row.market.market)"
      >
        <div class="coin-main">
          <span class="coin-main__name">{{ row.market.koreanName }}</span>
          <small class="coin-main__code">{{ assetCode(row.market.market) }} · {{ row.market.englishName }}</small>
        </div>
        <div class="coin-price">
          <strong>{{ formatPrice(row.ticker?.tradePrice) }}</strong>
          <small>{{ formatCompact(row.ticker?.accTradePrice24h) }}</small>
        </div>
          <span class="coin-change">
            {{ formatSignedRate(row.ticker) }}
          </span>
          <small class="sr-market-code">{{ row.market.market }}</small>
        </li>
    </ul>

    <div v-else class="coin-empty">
      <span aria-hidden="true"></span>
      <p>검색 결과가 없습니다.</p>
    </div>
  </aside>
</template>

<style scoped lang="scss">
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

.coin-search::before,
.coin-search::after {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  content: "";
}

.coin-search::before {
  top: 50%;
  left: 12px;
  width: 10px;
  height: 10px;
  border: 2px solid var(--text-muted);
  border-radius: 999px;
  transform: translateY(-60%);
}

.coin-search::after {
  top: 50%;
  left: 24px;
  width: 7px;
  height: 2px;
  border-radius: 999px;
  background: var(--text-muted);
  transform: rotate(45deg) translateY(3px);
}

input {
  @include field-control;
  padding: 10px 12px 10px 38px;
  font-size: 14px;
  font-weight: 600;
}

input::placeholder {
  color: var(--text-dim);
}

.coin-tools {
  display: grid;
  gap: 8px;
}

.coin-meta {
  margin: 0;
  @include muted-label;
}

.sort-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sort-tabs button {
  min-width: 0;
  flex: 1 1 0;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 7px 6px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease);
}

.sort-tabs button:hover,
.sort-tabs button.active {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: var(--panel-bg-strong);
}

.coin-list__rows {
  @include thin-scrollbar;
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
  grid-template-columns: minmax(0, 1.25fr) minmax(82px, 0.8fr) minmax(58px, auto);
  grid-template-areas: "main price change";
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  font-variant-numeric: tabular-nums;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;
}

.coin-row:hover,
.coin-row:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(168, 209, 163, 0.48);
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}

.coin-row.selected {
  background: rgba(168, 209, 163, 0.18);
  border-color: rgba(168, 209, 163, 0.72);
}

.coin-main,
.coin-price {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.coin-main {
  grid-area: main;
}

.coin-price {
  grid-area: price;
}

.coin-change {
  grid-area: change;
}

.coin-main__name {
  overflow: hidden;
  color: #f5f8ff;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coin-main__code,
.coin-price small {
  overflow: hidden;
  color: #96a4be;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coin-price {
  text-align: right;
}

.coin-price strong {
  color: #f2f0dd;
  font-size: 13px;
}

.coin-change {
  color: var(--c-flat);
  font-size: 13px;
  font-weight: 850;
  text-align: right;
  white-space: nowrap;
}

.coin-row.is-up .coin-change {
  color: var(--c-up);
}

.coin-row.is-down .coin-change {
  color: var(--c-down);
}

.sr-market-code {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.coin-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  margin: 18px 0 0;
  color: var(--text-muted);
  font-size: 14px;
}

.coin-empty span {
  width: 34px;
  height: 34px;
  border: 1px solid var(--panel-border-hover);
  border-radius: 999px;
  background: var(--c-up-bg);
}

.coin-empty p {
  margin: 0;
}

@media (max-width: 640px) {
  .coin-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "main change"
      "price change";
    column-gap: 8px;
    row-gap: 6px;
  }

  .coin-price {
    text-align: left;
  }

  .coin-change {
    align-self: center;
  }
}
</style>
