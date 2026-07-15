<script setup lang="ts">
import { computed } from "vue";

import type { MarketQuote, SimulatorOrderInput } from "../../api/simulator.js";
import { useSimulatorAccount } from "../../composables/useSimulatorAccount.js";
import SimulatorOrderForm from "./SimulatorOrderForm.vue";
import { toSimulatorSymbol } from "./simulatorMarket.js";

const props = defineProps<{
  market: string;
  marketPrice?: number;
  marketChangeRate?: number;
}>();

const {
  session,
  initialized,
  authLoading,
  authError,
  googleProviderEnabled,
  state,
  simulatorLoading,
  submitting,
  simulatorError,
  notice,
  isConfigured,
  signInWithGoogle,
  reload,
  placeOrder,
} = useSimulatorAccount();

const selectedSymbol = computed(() => toSimulatorSymbol(props.market));
const orderQuotes = computed<MarketQuote[]>(() => {
  const quotes = state.value?.quotes ?? [];
  const symbol = selectedSymbol.value;
  const price = props.marketPrice;
  if (!symbol || !price || price <= 0) return quotes;

  return quotes.map((quote) => quote.symbol === symbol
    ? {
        ...quote,
        price,
        changeRate: props.marketChangeRate ?? quote.changeRate,
      }
    : quote);
});

function submitOrder(order: SimulatorOrderInput): void {
  void placeOrder(order);
}
</script>

<template>
  <section class="exchange-simulator" aria-labelledby="exchange-simulator-title">
    <header class="exchange-simulator__head">
      <div>
        <h2 id="exchange-simulator-title">주문</h2>
      </div>
    </header>

    <div v-if="!selectedSymbol" class="exchange-simulator__state">
      <strong>이 종목은 아직 모의 주문을 지원하지 않습니다.</strong>
      <p>현재 MVP에서는 KRW-BTC와 KRW-ETH만 거래할 수 있습니다.</p>
    </div>

    <div v-else-if="!initialized" class="exchange-simulator__state" aria-live="polite">
      <strong>로그인 상태를 확인하고 있습니다.</strong>
    </div>

    <div v-else-if="!isConfigured" class="exchange-simulator__state exchange-simulator__state--error">
      <strong>Supabase 웹 설정이 필요합니다.</strong>
      <p>마이페이지 설정을 확인한 뒤 다시 시도해 주세요.</p>
    </div>

    <div v-else-if="!session" class="exchange-simulator__login">
      <div class="exchange-simulator__login-copy">
        <strong>{{ selectedSymbol }} 주문을 시작하세요.</strong>
        <p>Google 계정으로 로그인하면 1억원의 포인트가 바로 지급됩니다.</p>
      </div>

      <button
        class="exchange-simulator__login-button"
        type="button"
        :disabled="authLoading || googleProviderEnabled === false"
        @click="signInWithGoogle"
      >
        {{ authLoading
          ? "로그인 준비 중"
          : googleProviderEnabled === false
            ? "Google 로그인 설정 필요"
            : "Google 로그인" }}
      </button>
      <p v-if="authError" class="exchange-simulator__feedback is-error" role="alert">
        {{ authError }}
      </p>
    </div>

    <template v-else>
      <p v-if="simulatorError" class="exchange-simulator__feedback is-error" role="alert">
        {{ simulatorError }}
        <button type="button" @click="reload">다시 시도</button>
      </p>
      <p v-if="notice" class="exchange-simulator__feedback is-success" role="status">
        {{ notice }}
      </p>

      <div v-if="simulatorLoading && !state" class="exchange-simulator__state" aria-live="polite">
        <strong>모의 계좌를 불러오고 있습니다.</strong>
      </div>

      <div v-else-if="state" class="exchange-simulator__body">
        <SimulatorOrderForm
          :quotes="orderQuotes"
          :positions="state.positions"
          :purchased-symbols="state.purchasedSymbols"
          :total-asset="state.account.totalAsset"
          :cash-balance="state.account.cashBalance"
          :submitting="submitting"
          :selected-symbol="selectedSymbol"
          fixed-symbol
          embedded
          @submit="submitOrder"
        />
      </div>

      <div v-else class="exchange-simulator__state">
        <strong>계좌 정보를 불러오지 못했습니다.</strong>
        <button type="button" @click="reload">다시 시도</button>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.exchange-simulator {
  min-width: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  padding: clamp(16px, 2vw, 20px);
  background: var(--panel-bg);
  box-shadow: var(--shadow);
}

.exchange-simulator__head {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--panel-line);
  padding-bottom: 13px;
}

.exchange-simulator__head h2,
.exchange-simulator__head p {
  margin: 0;
}

.exchange-simulator__head h2 {
  @include panel-title(19px);
}

.exchange-simulator__head {
  margin: 0 0 3px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.exchange-simulator__feedback button,
.exchange-simulator__state button {
  flex: 0 0 auto;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.exchange-simulator__feedback button:hover,
.exchange-simulator__state button:hover {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
}

.exchange-simulator__body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 1fr;
  align-content: start;
  gap: 16px;
}

.exchange-simulator__state {
  flex: 1 1 auto;
  min-height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  border: 1px dashed var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 20px;
  text-align: center;
  background: color-mix(in srgb, var(--input-bg) 42%, transparent);
}

.exchange-simulator__state {
  flex-direction: column;
  gap: 7px;
}

.exchange-simulator__state strong {
  color: var(--text);
}

.exchange-simulator__state p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.exchange-simulator__state--error {
  border-color: var(--alert-border);
  background: var(--alert-bg);
}

.exchange-simulator__login {
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 238px;
  display: grid;
  align-content: center;
  gap: 16px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: clamp(20px, 3vw, 26px);
  background: color-mix(in srgb, var(--input-bg) 58%, var(--panel-bg));
  text-align: left;
}

.exchange-simulator__login::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--brand-lime);
  content: "";
}

.exchange-simulator__login-copy {
  display: grid;
  gap: 8px;
}

.exchange-simulator__login-copy strong {
  color: var(--text-strong);
  font-size: 21px;
  line-height: 1.35;
  letter-spacing: -0.025em;
}

.exchange-simulator__login-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.exchange-simulator__login-button {
  width: 100%;
  min-height: 42px;
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0 16px;
  color: #111827;
  background: var(--brand-lime);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.exchange-simulator__login-button:hover:not(:disabled),
.exchange-simulator__login-button:focus-visible:not(:disabled) {
  background: #e3ff8a;
  outline: 3px solid color-mix(in srgb, var(--brand-lime) 20%, transparent);
  outline-offset: 2px;
}

.exchange-simulator__login-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.exchange-simulator__login .exchange-simulator__feedback {
  margin: 0;
}

.exchange-simulator__feedback {
  margin: 0 0 12px;
  border: 1px solid;
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 750;
}

.exchange-simulator__feedback.is-error {
  border-color: var(--alert-border);
  color: var(--alert-text);
  background: var(--alert-bg);
}

.exchange-simulator__feedback.is-success {
  border-color: color-mix(in srgb, var(--c-up) 38%, transparent);
  color: var(--c-up);
  background: var(--c-up-bg);
}

@media (max-width: 760px) {
  .exchange-simulator__login {
    min-height: 230px;
    padding: 20px 16px;
  }
}

</style>
