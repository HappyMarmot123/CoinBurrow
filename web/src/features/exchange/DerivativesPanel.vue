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
  <section class="panel derivatives-panel" aria-label="파생상품 데이터">
    <div class="panel-head">
      <div class="panel-head-title">
        <h3>파생상품</h3>
        <TooltipButton
          button-class="derivatives-tooltip-button"
          kind="icon"
          aria-label="파생 데이터 출처"
          tooltip="파생 데이터 출처: Bybit 무기한 선물"
          type="button"
        >
          <span aria-hidden="true">?</span>
        </TooltipButton>
      </div>
    </div>
    <div v-if="loading" class="derivatives-state">파생 데이터 불러오는 중...</div>
    <div v-else-if="error" class="derivatives-state derivatives-state--error">
      {{ error }}
    </div>
    <div v-else-if="!hasData" class="derivatives-state">파생 데이터 없음</div>
    <dl v-else class="derivatives-grid">
      <div>
        <dt class="derivatives-term">
          <span>펀딩비</span>
          <TooltipButton
            button-class="derivatives-tooltip-button"
            kind="icon"
            aria-label="펀딩비 안내"
            tooltip="펀딩비는 선물 시장에서 롱/숏 간 증거금 비용을 정산하는 비율입니다."
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
          <span>미결제약정</span>
          <TooltipButton
            button-class="derivatives-tooltip-button"
            kind="icon"
            aria-label="미결제약정 안내"
            tooltip="미결제약정은 현재 시장에 열려 있는 선물 포지션의 총 규모입니다."
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
          <span>마지막 갱신</span>
          <TooltipButton
            button-class="derivatives-tooltip-button"
            kind="icon"
            aria-label="마지막 갱신 시간 안내"
            tooltip="해당 파생상품 스냅샷이 마지막으로 갱신된 시각입니다."
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

.panel-head-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;
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
