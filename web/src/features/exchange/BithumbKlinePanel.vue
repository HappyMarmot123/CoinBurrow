<script setup lang="ts">
import { computed } from "vue";

import type { BithumbKlineView } from "../../api/rest.js";
import { formatPrice, formatNumber } from "../../utils/format.js";

const props = defineProps<{
  loading: boolean;
  kline: BithumbKlineView | null;
  error: string;
  isApplicable: boolean;
}>();

const hasData = computed(() => Boolean(props.kline));

function formatValue(value?: string) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return value ?? "-";
  return formatPrice(raw);
}

const rateLabel = computed(() => {
  if (!props.kline) return "-";
  const open = Number(props.kline.open);
  const close = Number(props.kline.close);
  if (!Number.isFinite(open) || !Number.isFinite(close) || open === 0) return "-";
  const delta = ((close - open) / open) * 100;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(3)}%`;
});

const volumeLabel = computed(() => {
  if (!props.kline) return "-";
  const raw = Number(props.kline.volume);
  return Number.isFinite(raw) ? formatNumber(raw) : props.kline.volume;
});

const updateAtLabel = computed(() => {
  if (!props.kline?.ts) return "-";
  return new Date(props.kline.ts).toLocaleTimeString();
});
</script>

<template>
  <section class="panel bithumb-kline-panel" aria-label="Bithumb candle data">
    <div class="panel-head">
      <h3>Bithumb Candle</h3>
    </div>

    <div v-if="!isApplicable" class="bithumb-kline-state">
      KRW pair only (example: KRW-BTC)
    </div>
    <div v-else-if="loading" class="bithumb-kline-state">loading Bithumb candle...</div>
    <div v-else-if="error" class="bithumb-kline-state bithumb-kline-state--error">{{ error }}</div>
    <div v-else-if="!hasData" class="bithumb-kline-state">No candle data</div>

    <dl v-else class="bithumb-kline-grid">
      <div>
        <dt>Symbol</dt>
        <dd>{{ props.kline?.symbol ?? "-" }}</dd>
      </div>
      <div>
        <dt>Interval</dt>
        <dd>{{ props.kline?.interval ?? "-" }}</dd>
      </div>
      <div>
        <dt>Open</dt>
        <dd>{{ formatValue(props.kline?.open) }}</dd>
      </div>
      <div>
        <dt>Close</dt>
        <dd>{{ formatValue(props.kline?.close) }}</dd>
      </div>
      <div>
        <dt>Change</dt>
        <dd>{{ rateLabel }}</dd>
      </div>
      <div>
        <dt>High / Low</dt>
        <dd>{{ formatValue(props.kline?.high) }} / {{ formatValue(props.kline?.low) }}</dd>
      </div>
      <div>
        <dt>Volume</dt>
        <dd>{{ volumeLabel }}</dd>
      </div>
      <div>
        <dt>Last Update</dt>
        <dd>{{ updateAtLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped lang="scss">
.bithumb-kline-panel {
  display: grid;
  gap: 10px;
}

.bithumb-kline-state {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.bithumb-kline-state--error {
  color: var(--text-warn, #f5ae5c);
}

.bithumb-kline-grid {
  margin: 0;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bithumb-kline-grid dt {
  @include muted-label;
}

.bithumb-kline-grid dd {
  margin: 2px 0 0;
  color: var(--text-strong);
  font-size: 13px;
  overflow-wrap: anywhere;
}
</style>
