<script setup lang="ts">
import { computed } from "vue";

import type { DerivativesView } from "../../api/rest.js";
import { formatCompact } from "../../utils/format.js";

const props = defineProps<{
  loading: boolean;
  derivatives: DerivativesView | null;
  error: string;
}>();

const hasData = computed(() => Boolean(props.derivatives));

const fundingRateLabel = computed(() => {
  if (!props.derivatives?.fundingRate) return "-";
  const raw = Number(props.derivatives.fundingRate);
  if (!Number.isFinite(raw)) return props.derivatives.fundingRate;
  return `${(raw * 100).toFixed(4)}%`;
});

const openInterestLabel = computed(() => {
  if (!props.derivatives?.openInterest) return "-";
  return formatCompact(Number(props.derivatives.openInterest));
});

const updatedAtLabel = computed(() => {
  if (!props.derivatives?.ts) return "-";
  return new Date(props.derivatives.ts).toLocaleTimeString();
});
</script>

<template>
  <section class="panel derivatives-panel" aria-label="Derivatives data">
    <div class="panel-head">
      <h3>Derivatives</h3>
    </div>
    <div v-if="loading" class="derivatives-state">loading derivatives...</div>
    <div v-else-if="error" class="derivatives-state derivatives-state--error">
      {{ error }}
    </div>
    <div v-else-if="!hasData" class="derivatives-state">No derivatives data</div>
    <dl v-else class="derivatives-grid">
      <div>
        <dt>Funding</dt>
        <dd>{{ fundingRateLabel }}</dd>
      </div>
      <div>
        <dt>Open Interest</dt>
        <dd>{{ openInterestLabel }}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>{{ derivatives?.source ?? "-" }}</dd>
      </div>
      <div>
        <dt>Last Update</dt>
        <dd>{{ updatedAtLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped lang="scss">
.derivatives-panel {
  display: grid;
  gap: 10px;
}

.derivatives-state {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.derivatives-state--error {
  color: var(--text-warn, #f5ae5c);
}

.derivatives-grid {
  margin: 0;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.derivatives-grid dt {
  @include muted-label;
}

.derivatives-grid dd {
  margin: 2px 0 0;
  color: var(--text-strong);
  font-size: 13px;
}
</style>
