<script setup lang="ts">
import { computed } from "vue";
import type { MarketStatusView, MarketSummaryView } from "../../api/rest.js";
import type { TickerView } from "../../stores/types.js";
import { formatPrice } from "../../utils/format.js";

const props = defineProps<{
  ticker?: TickerView | null;
  market: string;
  selectedMarketSummary?: MarketSummaryView;
  selectedMarketStatus?: MarketStatusView;
  marketState: string;
}>();

const stats = computed(() => [
  { key: "open", label: "시가", value: props.ticker?.openingPrice, tone: "flat" as const },
  { key: "high", label: "고가", value: props.ticker?.highPrice, tone: "up" as const },
  { key: "low", label: "저가", value: props.ticker?.lowPrice, tone: "down" as const },
]);

const emit = defineEmits<{
  openDetail: [market: string];
}>();

function onOpenDetailClick() {
  emit("openDetail", props.market);
}
</script>

<template>
<section class="daily-stats" aria-label="일일 통계 / 종목 요약">
    <div class="daily-stats__prices">
      <span v-for="stat in stats" :key="stat.key" class="daily-stat" :class="`is-${stat.tone}`">
        <i>{{ stat.label }}</i>
        <b>{{ formatPrice(stat.value) }}</b>
      </span>
    </div>

    <div class="daily-stats__details" aria-label="종목 요약">
      <span class="dstat-state">
        {{ selectedMarketStatus ? marketState : "메타정보 대기중" }}
      </span>
      <div class="dstat-item-grid">
        <span class="dstat-item">
          <i>거래쌍</i>
          <b>{{ selectedMarketSummary?.market ?? market }}</b>
        </span>
        <span class="dstat-item">
          <i>심볼</i>
          <b>{{ selectedMarketSummary?.englishName ?? "-" }}</b>
        </span>
      </div>
      <button
        type="button"
        class="dstat-detail-btn"
        :aria-label="`${selectedMarketSummary?.market ?? market} 상세 열기`"
        @click="onOpenDetailClick"
      >
        상세
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.daily-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 18px;
  padding: 8px 12px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  background: var(--panel-bg);
  font-variant-numeric: tabular-nums;
}

.daily-stats__prices {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 18px;
  min-width: 0;
}

.daily-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.daily-stat i {
  font-style: normal;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.daily-stat b {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 800;
}

.daily-stat.is-up b {
  color: var(--c-up);
}

.daily-stat.is-down b {
  color: var(--c-down);
}

.daily-stats__details {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px 14px;
  min-width: 0;
  padding-left: 14px;
  border-left: 1px solid var(--panel-border);
}

.dstat-state {
  width: fit-content;
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.dstat-item-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 14px;
}

.dstat-item b {
  max-width: 180px;
}

.dstat-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.dstat-item i {
  font-style: normal;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.dstat-item b {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dstat-detail-btn {
  border: 1px solid var(--panel-border-hover);
  border-radius: var(--radius-sm);
  padding: 4px 7px;
  color: var(--brand-lime);
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  justify-self: end;
  align-self: center;
}

.dstat-detail-btn:focus-visible {
  outline: none;
}

@media (max-width: 640px) {
  .daily-stats {
    align-items: stretch;
    flex-direction: column;
  }

  .daily-stats__prices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    width: 100%;
  }

  .daily-stats__details {
    width: 100%;
    padding-left: 0;
    border-left: 0;
    grid-template-columns: 1fr auto;
    gap: 10px 10px;
  }

  .dstat-item-grid {
    grid-template-columns: 1fr;
    grid-column: 1 / -1;
  }

  .dstat-detail-btn {
    grid-column: 2 / -1;
  }
}
</style>
