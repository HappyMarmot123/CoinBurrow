<script setup lang="ts">
import type { TickerView } from "../../stores/types.js";
import { formatCompact, formatRate } from "../../utils/format.js";

defineProps<{
  topGainers: TickerView[];
  topLosers: TickerView[];
  topByVolume: TickerView[];
  resolveMarketName: (marketCode: string) => string;
}>();
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h3>마켓 무브먼트</h3>
    </div>
    <div class="ticker-grid">
      <div class="ticker-col">
        <p class="ticker-col__title ticker-col__title--up">상승 TOP</p>
        <ul>
          <li v-for="ticker in topGainers" :key="ticker.market">
            <span>{{ resolveMarketName(ticker.market) }}</span>
            <strong :class="{ up: true }">{{ formatRate(ticker.signedChangeRate) }}</strong>
          </li>
        </ul>
      </div>
      <div class="ticker-col">
        <p class="ticker-col__title ticker-col__title--down">하락 TOP</p>
        <ul>
          <li v-for="ticker in topLosers" :key="ticker.market">
            <span>{{ resolveMarketName(ticker.market) }}</span>
            <strong :class="{ down: true }">{{ formatRate(ticker.signedChangeRate) }}</strong>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h3>거래대금 TOP</h3>
    </div>
    <div class="summary-list-wrap">
      <ul class="summary-list">
        <li v-for="ticker in topByVolume" :key="ticker.market">
          <span>{{ resolveMarketName(ticker.market) }}</span>
          <strong>{{ formatCompact(ticker.accTradePrice24h) }}</strong>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
.panel {
  @include exchange-panel;
}

.panel-head {
  @include panel-head;
}

.panel-head h3 {
  @include panel-title(17px);
}

.ticker-grid {
  @include ticker-grid;
}

.ticker-col ul,
.summary-list {
  @include summary-list;
}

.ticker-col li,
.summary-list li {
  @include summary-row;
}

.ticker-col li:last-child,
.summary-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.summary-list-wrap {
  display: block;
}

.ticker-col span {
  color: var(--text);
  font-size: 13px;
}

.ticker-col__title {
  margin: 0 0 8px;
  @include muted-label;
}

.ticker-col__title--up {
  color: var(--c-up);
}

.ticker-col__title--down {
  color: var(--c-down);
}

.summary-list span,
.summary-list strong {
  color: var(--text);
}

.up {
  color: var(--c-up);
}

.down {
  color: var(--c-down);
}

@media (max-width: 640px) {
  .ticker-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 14px;
  }

  .panel-head {
    gap: 10px;
  }
}
</style>
