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
      <span class="muted">상승·하락 상위</span>
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
      <span class="muted">24h 거래대금 기준</span>
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
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.075);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.2);
}

.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  letter-spacing: 0;
  line-height: 1.25;
}

.muted {
  color: #9aa7bc;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ticker-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ticker-col ul,
.summary-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.ticker-col li,
.summary-list li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  padding-bottom: 8px;
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
  color: #d6e1f1;
  font-size: 13px;
}

.ticker-col__title {
  margin: 0 0 8px;
  color: #d2dced;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ticker-col__title--up {
  color: #6cb5ff;
}

.ticker-col__title--down {
  color: #f97373;
}

.summary-list span,
.summary-list strong {
  color: #d6e1f1;
}

@media (max-width: 640px) {
  .ticker-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 16px;
  }

  .panel-head {
    gap: 10px;
  }
}
</style>
