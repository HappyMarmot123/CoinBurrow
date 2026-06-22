<script setup lang="ts">
import { computed } from "vue";

import type { DerivativesView } from "../../api/rest.js";
import { formatCompact } from "../../utils/format.js";
import TooltipButton from "../../components/TooltipButton.vue";

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
        <dt class="derivatives-term">
          <span>Funding</span>
          <TooltipButton
            button-class="derivatives-tooltip-button"
            aria-label="Funding definition"
            tooltip="Funding is the periodic fee paid between long and short positions for futures contracts."
            type="button"
          >
            <span aria-hidden="true">?</span>
          </TooltipButton>
        </dt>
        <dd>
          <span class="derivatives-value">{{ fundingRateLabel }}</span>
        </dd>
      </div>
      <div>
        <dt class="derivatives-term">
          <span>Open Interest</span>
          <TooltipButton
            button-class="derivatives-tooltip-button"
            aria-label="Open interest definition"
            tooltip="Open interest is the total size of outstanding futures positions currently open in the market."
            type="button"
          >
            <span aria-hidden="true">?</span>
          </TooltipButton>
        </dt>
        <dd>
          <span class="derivatives-value">{{ openInterestLabel }}</span>
        </dd>
      </div>
      <div>
        <dt class="derivatives-term">
          <span>Source</span>
          <TooltipButton
            button-class="derivatives-tooltip-button"
            aria-label="Source definition"
            tooltip="Shows the exchange source of derivative data. This panel currently uses Bybit Linear/Inverse data."
            type="button"
          >
            <span aria-hidden="true">?</span>
          </TooltipButton>
        </dt>
        <dd>
          <span class="derivatives-value">{{ derivatives?.source ?? "-" }}</span>
        </dd>
      </div>
      <div>
        <dt class="derivatives-term">
          <span>Last Update</span>
          <TooltipButton
            button-class="derivatives-tooltip-button"
            aria-label="Last update definition"
            tooltip="Time when this derivatives snapshot was last refreshed."
            type="button"
          >
            <span aria-hidden="true">?</span>
          </TooltipButton>
        </dt>
        <dd>
          <span class="derivatives-value">{{ updatedAtLabel }}</span>
        </dd>
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  @include muted-label;
}

.derivatives-grid dd {
  margin: 2px 0 0;
  color: var(--text-strong);
  font-size: 13px;
}

.derivatives-value {
  display: inline-block;
  margin-bottom: 4px;
  color: var(--text-strong);
  font-size: 14px;
}

.derivatives-term {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.derivatives-tooltip-button {
  width: 16px;
  height: 16px;
  min-height: 16px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  padding: 0;
  font-size: 11px;
  line-height: 1;
}
</style>
