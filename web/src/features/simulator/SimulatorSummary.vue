<script setup lang="ts">
import { computed } from "vue";

import type { SimulatorAccount } from "../../api/simulator.js";

const props = defineProps<{ account: SimulatorAccount }>();

const currency = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const profitClass = computed(() => ({
  "account-summary__value--up": props.account.totalProfit > 0,
  "account-summary__value--down": props.account.totalProfit < 0,
}));

function formatKrw(value: number): string {
  return `${currency.format(Math.round(value))}원`;
}

function formatRate(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
</script>

<template>
  <section class="account-summary" aria-label="모의 계좌 요약">
    <div class="account-summary__total">
      <span>총 자산</span>
      <strong>{{ formatKrw(props.account.totalAsset) }}</strong>
      <small>현금과 보유 자산 평가액 합계</small>
    </div>

    <dl class="account-summary__details">
      <div>
        <dt>통합 손익</dt>
        <dd class="account-summary__value" :class="profitClass">
          {{ formatKrw(props.account.totalProfit) }}
          <small>{{ formatRate(props.account.returnRate) }}</small>
        </dd>
      </div>
      <div>
        <dt>주문 가능 현금</dt>
        <dd>{{ formatKrw(props.account.cashBalance) }}</dd>
      </div>
      <div>
        <dt>보유 자산 평가액</dt>
        <dd>{{ formatKrw(props.account.investedValue) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped lang="scss">
.account-summary {
  display: grid;
  grid-template-columns: minmax(260px, 1.1fr) minmax(0, 2fr);
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: var(--panel-bg);
  font-variant-numeric: tabular-nums;
}

.account-summary__total {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid var(--panel-line);
  padding: 24px;
}

.account-summary__total > span,
.account-summary dt {
  @include muted-label;
  text-transform: none;
}

.account-summary__total > strong {
  margin-top: 8px;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: clamp(27px, 3vw, 36px);
  font-weight: 900;
  letter-spacing: -0.04em;
}

.account-summary__total > small {
  margin-top: 7px;
  color: var(--text-muted);
  font-size: 11px;
}

.account-summary__details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

.account-summary__details > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 9px;
  padding: 20px;
}

.account-summary__details > div + div {
  border-left: 1px solid var(--panel-line);
}

.account-summary dt,
.account-summary dd {
  margin: 0;
}

.account-summary dd {
  overflow-wrap: anywhere;
  color: var(--text);
  font-size: clamp(15px, 1.7vw, 19px);
  font-weight: 850;
  letter-spacing: -0.025em;
}

.account-summary dd small {
  display: block;
  margin-top: 5px;
  color: inherit;
  font-size: 11px;
}

.account-summary__value--up {
  color: var(--c-up);
}

.account-summary__value--down {
  color: var(--c-down-strong);
}

@media (max-width: 820px) {
  .account-summary {
    grid-template-columns: 1fr;
  }

  .account-summary__total {
    border-right: 0;
    border-bottom: 1px solid var(--panel-line);
  }
}

@media (max-width: 620px) {
  .account-summary__details {
    grid-template-columns: 1fr;
  }

  .account-summary__total,
  .account-summary__details > div {
    padding: 18px;
  }

  .account-summary__details > div + div {
    border-top: 1px solid var(--panel-line);
    border-left: 0;
  }
}
</style>
