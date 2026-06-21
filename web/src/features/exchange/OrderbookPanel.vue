<script setup lang="ts">
import { useOrderbookStore } from "../../stores/orderbook.js";
import { computed } from "vue";
import { formatNumber } from "../../utils/format.js";

const orderbookStore = useOrderbookStore();
const emit = defineEmits<{ "select-price": [price: number] }>();
const ORDERBOOK_SIDE_LIMIT = 10;

const rows = computed(() => orderbookStore.current?.units ?? []);
const asks = computed(() =>
  rows.value
    .map((unit) => ({ price: unit.askPrice, size: unit.askSize }))
    .slice(0, ORDERBOOK_SIDE_LIMIT),
);
const bids = computed(() =>
  rows.value
    .map((unit) => ({ price: unit.bidPrice, size: unit.bidSize }))
    .slice(0, ORDERBOOK_SIDE_LIMIT)
    .reverse(),
);
const maxSize = computed(() => {
  const sizes = [...asks.value.map((ask) => ask.size), ...bids.value.map((bid) => bid.size)];
  return Math.max(...sizes, 1);
});
const bestAsk = computed(() => rows.value[0]?.askPrice);
const bestBid = computed(() => rows.value[0]?.bidPrice);
const midPrice = computed(() => {
  if (typeof bestAsk.value !== "number" || typeof bestBid.value !== "number") return undefined;
  return (bestAsk.value + bestBid.value) / 2;
});
const spread = computed(() => {
  if (typeof bestAsk.value !== "number" || typeof bestBid.value !== "number") return undefined;
  return bestAsk.value - bestBid.value;
});

function depthStyle(size: number) {
  return { "--depth": `${Math.max(4, (size / maxSize.value) * 100)}%` };
}

function selectMidPrice() {
  if (midPrice.value === undefined) return;
  emit("select-price", midPrice.value);
}
</script>

<template>
  <section class="orderbook">
    <p v-if="rows.length > 0" class="orderbook__summary">
      {{ orderbookStore.current?.market }}
    </p>

    <div v-if="rows.length > 0" class="orderbook-ladder" aria-label="호가 사다리">
      <div class="ladder-section ladder-section--ask">
        <button
          v-for="ask in asks"
          :key="`ask-${ask.price}`"
          class="ladder-row ladder-row--ask"
          type="button"
          :style="depthStyle(ask.size)"
          @click="emit('select-price', ask.price)"
        >
          <strong class="ladder-price ask">{{ formatNumber(ask.price) }}</strong>
          <span class="ladder-size">{{ formatNumber(ask.size) }}</span>
        </button>
      </div>

      <button
        class="orderbook-mid"
        type="button"
        :aria-label="`중간가 ${midPrice !== undefined ? formatNumber(midPrice) : '-'}, 스프레드 ${
          spread !== undefined ? formatNumber(spread) : '-'
        }`"
        :disabled="midPrice === undefined"
        @click="selectMidPrice"
      >
        <strong>{{ midPrice !== undefined ? formatNumber(midPrice) : "-" }}</strong>
        <em>스프레드: {{ spread !== undefined ? formatNumber(spread) : "-" }}</em>
      </button>

      <div class="ladder-section ladder-section--bid">
        <button
          v-for="bid in bids"
          :key="`bid-${bid.price}`"
          class="ladder-row ladder-row--bid"
          type="button"
          :style="depthStyle(bid.size)"
          @click="emit('select-price', bid.price)"
        >
          <strong class="ladder-price bid">{{ formatNumber(bid.price) }}</strong>
          <span class="ladder-size">{{ formatNumber(bid.size) }}</span>
        </button>
      </div>
    </div>
    <p v-else class="orderbook__empty">호가 데이터를 기다리는 중입니다.</p>
  </section>
</template>

<style scoped lang="scss">
.orderbook {
  min-width: 0;
  font-variant-numeric: tabular-nums;
}

.orderbook__summary {
  margin: 0 0 10px;
  @include muted-label;
}

.orderbook-ladder {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "bid"
    "mid"
    "ask";
  align-items: start;
  gap: 8px;
}

.ladder-section {
  display: grid;
  gap: 2px;
}

.ladder-section--ask {
  grid-area: ask;
}

.ladder-section--bid {
  grid-area: bid;
}

.ladder-row {
  --depth: 0%;
  position: relative;
  display: grid;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  padding: 6px 8px;
  overflow: hidden;
  color: var(--text);
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition:
    background var(--ease),
    transform var(--ease);
}

.ladder-row::before {
  position: absolute;
  inset: 0;
  width: var(--depth);
  content: "";
  pointer-events: none;
}

.ladder-row--ask::before {
  left: auto;
  right: 0;
  background: var(--c-down-bg);
}

.ladder-row--ask,
.ladder-row--bid {
  grid-template-columns: minmax(80px, auto) minmax(0, 1fr);
}

.ladder-row--bid::before {
  background: var(--c-up-bg);
}

.ladder-row:hover,
.ladder-row:focus-visible {
  background: var(--panel-bg-strong);
  transform: translateX(1px);
  outline: none;
}

.ladder-price,
.ladder-size {
  position: relative;
  z-index: 1;
}

.ladder-price {
  font-size: 13px;
  text-align: left;
}

.ladder-size {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ask {
  color: var(--c-down);
}

.bid {
  color: var(--c-up);
}

.orderbook-mid {
  grid-area: mid;
  position: relative;
  display: grid;
  grid-template-columns: minmax(80px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 1px solid var(--panel-border-hover);
  border-radius: var(--radius-sm);
  min-height: 34px;
  padding: 6px 8px;
  background: var(--panel-bg-strong);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition:
    background var(--ease),
    border-color var(--ease),
    transform var(--ease);
}

.orderbook-mid:hover,
.orderbook-mid:focus-visible {
  border-color: var(--brand-lime);
  background: var(--c-up-bg);
  transform: translateX(1px);
  outline: none;
}

.orderbook-mid:disabled {
  cursor: default;
  opacity: 0.72;
}

.orderbook-mid:disabled:hover {
  border-color: var(--panel-border-hover);
  background: var(--panel-bg-strong);
  transform: none;
}

.orderbook-mid em {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orderbook-mid strong {
  overflow: hidden;
  color: var(--brand-lime);
  font-size: 13px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orderbook__empty {
  margin: 34px 0;
  color: var(--text-muted);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .ladder-row {
    transition: none;
  }
}

@media (max-width: 520px) {
  .orderbook-ladder {
    grid-template-columns: 1fr;
    grid-template-areas:
      "bid"
      "mid"
      "ask";
  }
}
</style>
