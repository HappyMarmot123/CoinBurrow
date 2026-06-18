<script setup lang="ts">
import type { MarketStatusView, MarketSummaryView } from "../../api/rest.js";

defineProps<{
  market: string;
  selectedMarketStatus?: MarketStatusView;
  selectedMarketSummary?: MarketSummaryView;
  marketState: string;
  selectedMarketTradeCurrency: string;
  marketRestriction: string;
  marketStatusCautions: string[];
}>();
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h3>선택 마켓 상세</h3>
      <span class="muted">요약/경고/이벤트</span>
    </div>
    <p v-if="selectedMarketStatus" class="market-summary-empty">
      {{ marketState }}
    </p>
    <p v-else class="market-summary-empty">선택 마켓 메타정보 대기중입니다.</p>
    <dl class="market-summary-grid">
      <div>
        <dt>마켓</dt>
        <dd>{{ selectedMarketSummary?.market ?? market }}</dd>
      </div>
      <div>
        <dt>심볼</dt>
        <dd>{{ selectedMarketSummary?.englishName ?? "-" }}</dd>
      </div>
      <div>
        <dt>거래 통화</dt>
        <dd>{{ selectedMarketTradeCurrency }}</dd>
      </div>
      <div>
        <dt>제재</dt>
        <dd>{{ marketRestriction }}</dd>
      </div>
      <div>
        <dt>주의 항목</dt>
        <dd v-if="marketStatusCautions.length === 0">-</dd>
        <dd v-else>
          <ul class="market-caution-list">
            <li v-for="caution in marketStatusCautions" :key="caution">
              {{ caution }}
            </li>
          </ul>
        </dd>
      </div>
    </dl>
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

.market-summary-empty {
  margin: 6px 0 12px;
  color: #b7c5d7;
}

.market-summary-grid {
  margin: 0;
  display: grid;
  gap: 10px;
}

.market-summary-grid dt {
  color: #9fb0c4;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.market-summary-grid dd {
  margin: 0;
  color: #f1f6ff;
}

.market-caution-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.market-caution-list li {
  margin: 0;
}

@media (max-width: 640px) {
  .panel {
    padding: 16px;
  }

  .panel-head {
    gap: 10px;
  }
}
</style>
