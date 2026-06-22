<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMarketStore } from "../../stores/market.js";
import { useTickerStore } from "../../stores/ticker.js";
import type { MarketView, TickerView } from "../../stores/types.js";
import { getBithumbMarkets, type BithumbMarketView } from "../../api/rest.js";
import { formatCompact, formatPrice } from "../../utils/format.js";

const props = defineProps<{ selected: string; quote?: string }>();

const emit = defineEmits<{
  select: [market: string];
  openDetail: [market: string];
}>();
const marketStore = useMarketStore();
const tickerStore = useTickerStore();
const query = ref("");
const sortKey = ref<"volume" | "price" | "change" | "premium">("volume");
const premiumPrices = ref<Record<string, number>>({});
const premiumLoadError = ref("");
const premiumLoadToken = ref(0);

interface MarketRow {
  market: MarketView;
  ticker?: TickerView;
  source: string;
  premium: number | null;
}

const quote = computed(() => (props.quote ?? "").trim().toUpperCase());

function normalizeMarketForBithumb(marketCode: string): string | null {
  const base = marketCode.split("-").at(-1)?.toUpperCase();
  if (!base) return null;
  return `${base}/KRW`;
}

function parseBithumbPrice(raw: BithumbMarketView["lastPrice"]): number | null {
  const normalized = String(raw).replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculatePremium(upbitPrice: number, bithumbPrice: number): number | null {
  if (!Number.isFinite(upbitPrice) || !Number.isFinite(bithumbPrice)) {
    return null;
  }

  if (upbitPrice <= 0) return null;
  return ((bithumbPrice - upbitPrice) / upbitPrice) * 100;
}

function premiumClass(value: number | null): string {
  if (value === null) return "";
  if (value > 0) return "is-up";
  if (value < 0) return "is-down";
  return "";
}

function formatPremium(value: number | null): string {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

async function loadPremiumMarkets() {
  const currentToken = ++premiumLoadToken.value;
  const isActiveCall = () => currentToken === premiumLoadToken.value;
  premiumLoadError.value = "";

  if (quote.value !== "KRW") {
    if (isActiveCall()) {
      premiumPrices.value = {};
    }
    return;
  }

  const symbols = [...new Set(
    marketStore.list
      .filter((market) => market.market.startsWith("KRW-"))
      .map((market) => normalizeMarketForBithumb(market.market))
      .filter((symbol): symbol is string => typeof symbol === "string"),
  )];

  if (symbols.length === 0) {
    if (isActiveCall()) {
      premiumPrices.value = {};
    }
    return;
  }

  try {
    const payload = await getBithumbMarkets(symbols);

    if (currentToken !== premiumLoadToken.value) return;

    const next: Record<string, number> = {};
    payload.forEach((item) => {
      const base = item.symbol.split("/")[0]?.toUpperCase();
      if (!base) return;
      const price = parseBithumbPrice(item.lastPrice);
      if (price === null) return;
      next[`KRW-${base}`] = price;
    });

    premiumPrices.value = next;
  } catch (cause) {
    if (isActiveCall()) {
      premiumPrices.value = {};
      premiumLoadError.value = cause instanceof Error ? cause.message : "failed to load premium source data";
    }
  }
}

watch(
  () => [quote.value, marketStore.list],
  () => {
    void loadPremiumMarkets();
  },
  { immediate: true, deep: true },
);

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
      source: premiumPrices.value[market.market] !== undefined ? "UPBIT / BITHUMB" : "UPBIT",
      premium: calculatePremium(
        tickerStore.byMarket[market.market]?.tradePrice ?? Number.NaN,
        premiumPrices.value[market.market] ?? Number.NaN,
      ),
    }))
    .sort((a, b) => {
      if (sortKey.value === "price") {
        return (b.ticker?.tradePrice ?? Number.NEGATIVE_INFINITY) - (a.ticker?.tradePrice ?? Number.NEGATIVE_INFINITY);
      }
      if (sortKey.value === "change") {
        return (b.ticker?.signedChangeRate ?? Number.NEGATIVE_INFINITY) - (a.ticker?.signedChangeRate ?? Number.NEGATIVE_INFINITY);
      }
      if (sortKey.value === "premium") {
        return (b.premium ?? Number.NEGATIVE_INFINITY) - (a.premium ?? Number.NEGATIVE_INFINITY);
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

function openDetail(event: MouseEvent, marketCode: string) {
  event.stopPropagation();
  emit("openDetail", marketCode);
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
        <button
          v-if="quote === 'KRW'"
          :class="{ active: sortKey === 'premium' }"
          type="button"
          @click="sortKey = 'premium'"
        >
          프리미엄
        </button>
      </div>
    </div>
    <p v-if="premiumLoadError" class="coin-premium-error">{{ premiumLoadError }}</p>

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
          <div class="coin-main__meta">
            <span class="coin-main__source">{{ row.source }}</span>
            <span v-if="quote === 'KRW'" class="coin-main__premium" :class="premiumClass(row.premium)">
              {{ formatPremium(row.premium) }}
            </span>
          </div>
        </div>
        <div class="coin-price">
          <strong>{{ formatPrice(row.ticker?.tradePrice) }}</strong>
          <small>{{ formatCompact(row.ticker?.accTradePrice24h) }}</small>
        </div>
          <span class="coin-change">
            {{ formatSignedRate(row.ticker) }}
          </span>
          <button
            type="button"
            :aria-label="`Open detail for ${row.market.koreanName}`"
            class="coin-detail-btn"
            @click="openDetail($event, row.market.market)"
          >
            Detail
          </button>
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
  grid-template-columns: minmax(0, 1.25fr) minmax(82px, 0.8fr) minmax(58px, auto) auto;
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
.coin-main__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.coin-main__source,
.coin-main__premium {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 750;
}

.coin-main__premium.is-up {
  border-color: rgba(80, 188, 140, 0.55);
  color: var(--c-up);
}

.coin-main__premium.is-down {
  border-color: rgba(246, 99, 99, 0.55);
  color: var(--c-down);
}

.coin-premium-error {
  margin: 0;
  color: var(--c-flat);
  font-size: 11px;
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

.coin-detail-btn {
  justify-self: end;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease);
}

.coin-detail-btn:hover,
.coin-detail-btn:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  background: var(--panel-bg-strong);
  outline: none;
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
    grid-template-columns: minmax(0, 1fr) auto auto;
    column-gap: 8px;
  }

  .coin-price {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    text-align: left;
  }

  .coin-change {
    grid-column: 2 / 3;
    grid-row: 1 / 3;
  }

  .coin-detail-btn {
    grid-column: 3 / 4;
    align-self: start;
  }
}
</style>
