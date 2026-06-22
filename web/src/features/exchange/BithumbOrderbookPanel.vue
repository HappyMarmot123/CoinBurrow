<script setup lang="ts">
import { computed } from "vue";

import type { BithumbOrderbookView } from "../../api/rest.js";
import { formatPrice, formatNumber } from "../../utils/format.js";

const props = defineProps<{
  loading: boolean;
  orderbook: BithumbOrderbookView | null;
  error: string;
  isApplicable: boolean;
}>();

const hasData = computed(() => Boolean(props.orderbook));

const bidPrice = computed(() => props.orderbook?.bids?.[0]?.[0] ?? "-");
const askPrice = computed(() => props.orderbook?.asks?.[0]?.[0] ?? "-");

function formatSide(price?: string) {
  const raw = Number(price);
  return Number.isFinite(raw) ? formatPrice(raw) : price || "-";
}

function formatSideSize(size?: string) {
  const raw = Number(size);
  return Number.isFinite(raw) ? formatNumber(raw) : size || "-";
}

const updatedAtLabel = computed(() => {
  const timestamp = props.orderbook?.ts ?? props.orderbook?.lastUpdateTs;
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString();
});

const selectedSymbol = computed(() => props.orderbook?.symbol ?? "-");
</script>

<template>
  <section class="panel bithumb-orderbook-panel" aria-label="Bithumb orderbook data">
    <div class="panel-head">
      <h3>Bithumb Orderbook</h3>
    </div>

    <div v-if="!isApplicable" class="bithumb-orderbook-state">
      KRW pair only (example: KRW-BTC)
    </div>
    <div v-else-if="loading" class="bithumb-orderbook-state">loading Bithumb orderbook...</div>
    <div v-else-if="error" class="bithumb-orderbook-state bithumb-orderbook-state--error">{{ error }}</div>
    <div v-else-if="!hasData" class="bithumb-orderbook-state">No orderbook data</div>

    <dl v-else class="bithumb-orderbook-grid">
      <div>
        <dt>Symbol</dt>
        <dd>{{ selectedSymbol }}</dd>
      </div>
      <div>
        <dt>Top Ask</dt>
        <dd>{{ formatSide(askPrice) }} / {{ formatSideSize(props.orderbook?.asks?.[0]?.[1]) }}</dd>
      </div>
      <div>
        <dt>Top Bid</dt>
        <dd>{{ formatSide(bidPrice) }} / {{ formatSideSize(props.orderbook?.bids?.[0]?.[1]) }}</dd>
      </div>
      <div>
        <dt>Last Update</dt>
        <dd>{{ updatedAtLabel }}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>{{ props.orderbook?.source ?? "-" }}</dd>
      </div>
      <div>
        <dt>ASK/BID Depth</dt>
        <dd>{{ props.orderbook?.asks?.length ?? 0 }} / {{ props.orderbook?.bids?.length ?? 0 }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped lang="scss">
.bithumb-orderbook-panel {
  display: grid;
  gap: 10px;
}

.bithumb-orderbook-state {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.bithumb-orderbook-state--error {
  color: var(--text-warn, #f5ae5c);
}

.bithumb-orderbook-grid {
  margin: 0;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bithumb-orderbook-grid dt {
  @include muted-label;
}

.bithumb-orderbook-grid dd {
  margin: 2px 0 0;
  color: var(--text-strong);
  font-size: 13px;
  overflow-wrap: anywhere;
}
</style>
