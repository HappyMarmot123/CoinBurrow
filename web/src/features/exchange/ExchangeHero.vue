<script setup lang="ts">
import type { TickerView } from "../../stores/types.js";
import { formatPrice, formatRatio } from "../../utils/format.js";

defineProps<{
  exchangeError: string;
  statusError: string;
  selectedMarketLabel: string;
  marketState: string;
  quote: string;
  liveTicker?: TickerView;
  spreadRatio?: number;
  usdKrwRate: number | null;
}>();
</script>

<template>
  <section class="exchange-hero">
    <p class="kicker">CoinBurrow Exchange Console</p>
    <h1>실시간 마켓 레이어</h1>
    <p class="hero-lead">코인 리스트, 1분봉, 호가, 체결 체인을 한 화면에서 연결해 전환하는 데 걸리는 시간을 최소화한 대시보드입니다.</p>
    <div class="hero-metrics">
      <p v-if="exchangeError" class="hero-error">{{ exchangeError }}</p>
      <p v-if="statusError" class="hero-error">{{ statusError }}</p>
      <article class="metric-card">
        <span>선택 마켓</span>
        <strong>{{ selectedMarketLabel }}</strong>
      </article>
      <article class="metric-card">
        <span>시장 상태</span>
        <strong>{{ marketState }}</strong>
      </article>
      <article class="metric-card">
        <span>마켓 구분</span>
        <strong>{{ quote }}</strong>
      </article>
      <article class="metric-card">
        <span>거래대금(24h)</span>
        <strong>{{ formatPrice(liveTicker?.accTradePrice24h) }}</strong>
      </article>
      <article class="metric-card">
        <span>스프레드</span>
        <strong>{{ formatRatio(spreadRatio) }}</strong>
      </article>
      <article class="metric-card">
        <span>실시간 채널</span>
        <strong>ticker / candle / orderbook / trade</strong>
      </article>
      <article v-if="usdKrwRate" class="metric-card">
        <span>USD/KRW</span>
        <strong>{{ formatPrice(usdKrwRate) }}</strong>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.exchange-hero {
  width: min(1500px, calc(100% - 40px));
  margin: 0 auto clamp(22px, 4vw, 34px);
}

.kicker {
  display: inline-flex;
  margin: 0 0 12px;
  color: #a8d1a3;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(36px, 5.3vw, 52px);
  line-height: 1.06;
  letter-spacing: 0;
}

.hero-lead {
  margin: 14px 0 24px;
  max-width: 840px;
  color: #c2cedf;
  font-size: 19px;
  line-height: 1.7;
}

.hero-error {
  grid-column: 1 / -1;
  margin: 0;
  border-radius: 12px;
  border: 1px solid rgba(255, 123, 123, 0.45);
  background: rgba(220, 50, 50, 0.18);
  color: #ffe7e7;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 700;
  padding: 12px 14px;
}

.hero-metrics {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.metric-card {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
}

.metric-card span {
  display: block;
  margin-bottom: 8px;
  color: #b9c3d4;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.metric-card strong {
  color: #f2f0dd;
  font-size: 17px;
  line-height: 1.35;
  font-weight: 700;
}

@media (max-width: 1200px) {
  .exchange-hero,
  .hero-metrics {
    width: min(1300px, calc(100% - 28px));
  }

  .hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  h1 {
    font-size: clamp(34px, 7.4vw, 44px);
  }

  .hero-lead {
    font-size: 18px;
  }
}

@media (max-width: 640px) {
  .exchange-hero {
    width: min(640px, calc(100% - 20px));
  }

  .hero-lead {
    font-size: 16px;
  }

  .hero-metrics {
    gap: 10px;
  }

  .metric-card strong {
    font-size: 16px;
  }
}
</style>
