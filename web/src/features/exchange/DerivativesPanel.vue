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
        <dd>
          <span class="derivatives-value">{{ fundingRateLabel }}</span>
          <p class="derivatives-note">
            8시간마다 정산되는 무기한 선물 펀딩비율입니다. 양수면 롱 포지션이 비용을, 음수면 숏 포지션이 비용을 부담합니다.
          </p>
        </dd>
      </div>
      <div>
        <dt>Open Interest</dt>
        <dd>
          <span class="derivatives-value">{{ openInterestLabel }}</span>
          <p class="derivatives-note">
            현재 미결제 상태로 남아 있는 파생상품 계약의 총 개/명목가치입니다.
          </p>
        </dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>
          <span class="derivatives-value">{{ derivatives?.source ?? "-" }}</span>
          <p class="derivatives-note">
            Bybit 선물/파생상품 데이터(Linear/Inverse) API로 조회했습니다.
          </p>
        </dd>
      </div>
      <div>
        <dt>Last Update</dt>
        <dd>
          <span class="derivatives-value">{{ updatedAtLabel }}</span>
          <p class="derivatives-note">해당 지표가 마지막으로 갱신된 시각입니다.</p>
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

.derivatives-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
}
</style>
