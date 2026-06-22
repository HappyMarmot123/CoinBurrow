<script setup lang="ts">
import { computed } from "vue";

import type { BithumbMarketView } from "../../api/rest.js";
import { formatCompact, formatPrice } from "../../utils/format.js";

const props = defineProps<{
  loading: boolean;
  market: BithumbMarketView | null;
  error: string;
  isApplicable: boolean;
  selectedMarket: string;
}>();

const hasData = computed(() => Boolean(props.market));

const selectedMarketSymbol = computed(() => {
  const value = props.market?.symbol?.trim();
  return value || props.selectedMarket;
});

const lastPriceLabel = computed(() => {
  if (!props.market) return "-";
  const raw = Number(props.market.lastPrice);
  return Number.isFinite(raw) ? formatPrice(raw) : props.market.lastPrice;
});

const changeRateLabel = computed(() => {
  if (!props.market?.changeRate) return "-";
  const raw = Number(props.market.changeRate);
  if (!Number.isFinite(raw)) return props.market.changeRate;
  if (raw > 0) return `+${raw}%`;
  return `${raw}%`;
});

const quoteVolumeLabel = computed(() => {
  if (!props.market) return "-";
  const raw = Number(props.market.quoteVolume);
  return Number.isFinite(raw) ? formatCompact(raw) : props.market.quoteVolume;
});

const lastUpdatedLabel = computed(() => {
  if (!props.market?.ts) return "-";
  return new Date(props.market.ts).toLocaleTimeString();
});
</script>

<template>
  <section class="panel bithumb-market-panel" aria-label="Bithumb market data">
    <div class="panel-head">
      <h3>Bithumb KRW</h3>
    </div>

    <div v-if="!isApplicable" class="bithumb-market-state">
      KRW pair only (example: KRW-BTC)
    </div>
    <div v-else-if="loading" class="bithumb-market-state">loading Bithumb data...</div>
    <div v-else-if="error" class="bithumb-market-state bithumb-market-state--error">
      {{ error }}
    </div>
    <div v-else-if="!hasData" class="bithumb-market-state">
      No Bithumb market data
    </div>

    <dl v-else class="bithumb-market-grid">
      <div>
        <dt>Symbol</dt>
        <dd>{{ selectedMarketSymbol }}</dd>
      </div>
      <div>
        <dt>Last Price</dt>
        <dd>{{ lastPriceLabel }}</dd>
      </div>
      <div>
        <dt>Change</dt>
        <dd>{{ changeRateLabel }}</dd>
      </div>
      <div>
        <dt>24h Quote Volume</dt>
        <dd>{{ quoteVolumeLabel }}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>{{ market?.source ?? "-" }}</dd>
      </div>
      <div>
        <dt>Last Update</dt>
        <dd>{{ lastUpdatedLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped lang="scss">
.bithumb-market-panel {
  display: grid;
  gap: 10px;
}

.bithumb-market-state {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.bithumb-market-state--error {
  color: var(--text-warn, #f5ae5c);
}

.bithumb-market-grid {
  margin: 0;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bithumb-market-grid dt {
  @include muted-label;
}

.bithumb-market-grid dd {
  margin: 2px 0 0;
  color: var(--text-strong);
  font-size: 13px;
  overflow-wrap: anywhere;
}
</style>
