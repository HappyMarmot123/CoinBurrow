<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";

import type {
  MarketQuote,
  OrderSide,
  SimulatorOrderInput,
  SimulatorPosition,
  SimulatorSymbol,
} from "../../api/simulator.js";

const props = withDefaults(defineProps<{
  quotes: MarketQuote[];
  positions: SimulatorPosition[];
  purchasedSymbols?: SimulatorSymbol[];
  totalAsset?: number;
  cashBalance: number;
  submitting: boolean;
  selectedSymbol?: SimulatorSymbol;
  fixedSymbol?: boolean;
  embedded?: boolean;
}>(), {
  selectedSymbol: "BTC",
  purchasedSymbols: () => [],
  totalAsset: 0,
  fixedSymbol: false,
  embedded: false,
});
const emit = defineEmits<{ submit: [order: SimulatorOrderInput] }>();

const symbol = shallowRef<SimulatorSymbol>(props.selectedSymbol);
const side = shallowRef<OrderSide>("buy");
const quantityInput = shallowRef("");
const totalInput = shallowRef("");
const lastEditedField = shallowRef<"quantity" | "total">("total");
const isDirectInput = shallowRef(false);
const directRatio = shallowRef(0);
const localError = shallowRef("");

const currency = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const assetQuantity = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 });
const assetNames = { BTC: "비트코인", ETH: "이더리움" } as const;
const ratioPresets = [0.1, 0.25, 0.5, 1] as const;
const inputStep = 0.01;
const inputScale = 100;

const selectedQuote = computed(() => props.quotes.find((quote) => quote.symbol === symbol.value));
const selectedPosition = computed(() => props.positions.find((position) => position.symbol === symbol.value));
const selectedPrice = computed(() => selectedQuote.value?.price ?? 0);
const parsedQuantity = computed(() => Number(quantityInput.value));
const parsedTotal = computed(() => Number(totalInput.value));
const availableQuantity = computed(() => {
  if (side.value === "sell") return selectedPosition.value?.quantity ?? 0;
  return selectedPrice.value > 0 ? props.cashBalance / selectedPrice.value : 0;
});
const availableTotal = computed(() => (
  side.value === "buy"
    ? props.cashBalance
    : (selectedPosition.value?.quantity ?? 0) * selectedPrice.value
));
const isBuyLocked = computed(() => (
  side.value === "buy" && props.purchasedSymbols.includes(symbol.value)
));
const canSubmit = computed(() => (
  !props.submitting
  && !isBuyLocked.value
  && selectedPrice.value > 0
  && Number.isFinite(parsedQuantity.value)
  && parsedQuantity.value > 0
  && parsedQuantity.value <= availableQuantity.value
  && Number.isFinite(parsedTotal.value)
  && parsedTotal.value > 0
  && parsedTotal.value <= availableTotal.value
  && Math.abs(parsedQuantity.value * inputScale - Math.round(parsedQuantity.value * inputScale)) < 0.000001
));

function decimalInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const normalized = Math.floor((value + Number.EPSILON) * inputScale) / inputScale;
  return normalized > 0 ? normalized.toFixed(2).replace(/\.?0+$/, "") : "";
}

function normalizedQuantity(value: number): number {
  return Math.floor((value + Number.EPSILON) * inputScale) / inputScale;
}

function sanitizedDecimalInput(rawValue: string): string {
  if (rawValue === "") return "";
  if (rawValue.trim().startsWith("-")) return "0";

  const unsigned = rawValue.replaceAll(",", ".").replace(/[^\d.]/g, "");
  if (!unsigned) return "";

  const [wholePart = "", ...fractionParts] = unsigned.split(".");
  const whole = (wholePart || "0").replace(/^0+(?=\d)/, "");
  if (!unsigned.includes(".")) return whole;

  const fraction = fractionParts.join("").slice(0, 2);
  return `${whole}.${fraction}`;
}

function syncTotalFromQuantity(): void {
  const quantity = parsedQuantity.value;
  totalInput.value = Number.isFinite(quantity) && quantity > 0 && selectedPrice.value > 0
    ? decimalInput(quantity * selectedPrice.value)
    : "";
}

function syncQuantityFromTotal(): void {
  const total = parsedTotal.value;
  quantityInput.value = Number.isFinite(total) && total > 0 && selectedPrice.value > 0
    ? decimalInput(normalizedQuantity(total / selectedPrice.value))
    : "";
}

function resetOrderInput(): void {
  quantityInput.value = "";
  totalInput.value = "";
  lastEditedField.value = side.value === "buy" ? "total" : "quantity";
  isDirectInput.value = false;
  directRatio.value = 0;
  localError.value = "";
}

function syncDirectRatio(): void {
  const quantity = parsedQuantity.value;
  if (!Number.isFinite(quantity) || quantity <= 0 || availableQuantity.value <= 0) {
    directRatio.value = 0;
    return;
  }

  directRatio.value = Math.min(100, Math.max(0, Math.round(
    (quantity / availableQuantity.value) * 100,
  )));
}

watch(
  () => props.selectedSymbol,
  (nextSymbol) => {
    symbol.value = nextSymbol;
    resetOrderInput();
  },
);

watch(availableQuantity, () => {
  if (isDirectInput.value) syncDirectRatio();
});

watch(selectedPrice, () => {
  if (lastEditedField.value === "total") syncQuantityFromTotal();
  else syncTotalFromQuantity();
  if (isDirectInput.value) syncDirectRatio();
});

watch(isBuyLocked, (locked) => {
  if (locked) resetOrderInput();
});

function selectSide(nextSide: OrderSide): void {
  side.value = nextSide;
  resetOrderInput();
}

function changeSymbol(): void {
  resetOrderInput();
}

function updateQuantity(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  quantityInput.value = sanitizedDecimalInput(input.value);
  input.value = quantityInput.value;
  lastEditedField.value = "quantity";
  syncTotalFromQuantity();
  localError.value = "";
  if (isDirectInput.value) syncDirectRatio();
}

function updateTotal(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  totalInput.value = sanitizedDecimalInput(input.value);
  input.value = totalInput.value;
  lastEditedField.value = "total";
  syncQuantityFromTotal();
  localError.value = "";
  if (isDirectInput.value) syncDirectRatio();
}

function setRatio(ratio: number): void {
  const boundedRatio = Math.min(1, Math.max(0, ratio));
  const nextQuantity = normalizedQuantity(availableQuantity.value * boundedRatio);
  quantityInput.value = nextQuantity > 0 ? String(nextQuantity) : "";
  lastEditedField.value = "quantity";
  syncTotalFromQuantity();
  directRatio.value = Math.round(boundedRatio * 100);
  localError.value = "";
}

function steppedValue(currentValue: number, direction: -1 | 1): number {
  const baseValue = Number.isFinite(currentValue) && currentValue > 0 ? currentValue : 0;
  return Math.max(0, Math.round((baseValue + direction * inputStep) * inputScale) / inputScale);
}

function adjustQuantity(direction: -1 | 1): void {
  const nextQuantity = steppedValue(parsedQuantity.value, direction);
  quantityInput.value = nextQuantity > 0 ? decimalInput(nextQuantity) : "0";
  lastEditedField.value = "quantity";
  syncTotalFromQuantity();
  localError.value = "";
  if (isDirectInput.value) syncDirectRatio();
}

function adjustTotal(direction: -1 | 1): void {
  const nextTotal = steppedValue(parsedTotal.value, direction);
  totalInput.value = nextTotal > 0 ? decimalInput(nextTotal) : "0";
  lastEditedField.value = "total";
  syncQuantityFromTotal();
  localError.value = "";
  if (isDirectInput.value) syncDirectRatio();
}

function enterDirectInput(): void {
  isDirectInput.value = true;
  syncDirectRatio();
}

function leaveDirectInput(): void {
  isDirectInput.value = false;
}

function updateDirectRatio(event: Event): void {
  const nextRatio = Number((event.currentTarget as HTMLInputElement).value);
  directRatio.value = Number.isFinite(nextRatio) ? nextRatio : 0;
  setRatio(directRatio.value / 100);
}

function submit(): void {
  if (!canSubmit.value) {
    if (isBuyLocked.value) {
      localError.value = "계좌 초기화 전에는 이 종목을 다시 매수할 수 없습니다.";
      return;
    }
    localError.value = side.value === "buy"
      ? "주문 가능 현금 안에서 수량 또는 총액을 입력해 주세요."
      : "보유 수량 안에서 수량 또는 총액을 입력해 주세요.";
    return;
  }

  localError.value = "";
  emit("submit", {
    symbol: symbol.value,
    side: side.value,
    quantity: parsedQuantity.value,
  });
}
</script>

<template>
  <section
    class="order-panel"
    :class="{ 'order-panel--embedded': embedded }"
    aria-labelledby="order-title"
  >
    <header class="order-panel__head">
      <h2 id="order-title">주문</h2>
      <span>시장가 · 수수료 0%</span>
    </header>

    <div class="side-tabs" role="group" aria-label="주문 방향">
      <button
        type="button"
        :class="{ active: side === 'buy' }"
        :aria-pressed="side === 'buy'"
        @click="selectSide('buy')"
      >
        매수
      </button>
      <button
        type="button"
        :class="{ active: side === 'sell' }"
        :aria-pressed="side === 'sell'"
        @click="selectSide('sell')"
      >
        매도
      </button>
    </div>

    <p v-if="isBuyLocked" class="order-limit" role="status">
      이미 매수한 종목입니다. MVP에서는 계좌 초기화 전까지 종목별로 한 번만 매수할 수 있습니다.
    </p>

    <section class="account-summary" aria-label="계좌 및 시장 정보">
      <div class="account-total">
        <span class="account-summary__label">총 자산</span>
        <strong class="account-total__value">{{ currency.format(totalAsset) }}원</strong>
      </div>

      <div v-if="fixedSymbol" class="account-summary__row selected-asset">
        <span class="account-summary__label">선택 종목</span>
        <strong class="account-summary__value">{{ symbol }} · {{ assetNames[symbol] }}</strong>
      </div>

      <label v-else class="account-summary__row account-summary__selector field">
        <span class="account-summary__label">자산</span>
        <select v-model="symbol" aria-label="주문 자산" @change="changeSymbol">
          <option value="BTC">BTC · 비트코인</option>
          <option value="ETH">ETH · 이더리움</option>
        </select>
      </label>

      <div class="account-summary__row quote-row">
        <span class="account-summary__label">현재 시장가</span>
        <strong class="quote-row__price">{{ currency.format(selectedQuote?.price ?? 0) }}원</strong>
        <small
          class="quote-row__change"
          :class="(selectedQuote?.changeRate ?? 0) >= 0 ? 'is-up' : 'is-down'"
        >
          {{ ((selectedQuote?.changeRate ?? 0) * 100).toFixed(2) }}%
        </small>
      </div>

      <div
        class="account-summary__row order-availability"
        :class="`order-availability--${side}`"
      >
        <span class="account-summary__label">
          {{ side === "buy" ? "주문 가능 현금" : `${symbol} 보유 수량` }}
        </span>
        <strong class="order-availability__value">
          {{ side === "buy"
            ? `${currency.format(cashBalance)}원`
            : `${assetQuantity.format(selectedPosition?.quantity ?? 0)} ${symbol}` }}
        </strong>
      </div>
    </section>

    <div class="order-fields">
      <div class="field">
        <label class="field__label" for="order-price">
          {{ side === "buy" ? "매수가격" : "매도가격" }}
        </label>
        <div class="order-input order-input--readonly">
          <input
            id="order-price"
            name="order-price"
            type="text"
            :value="selectedPrice > 0 ? currency.format(selectedPrice) : ''"
            placeholder="0"
            readonly
          >
          <b>KRW</b>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="order-quantity">주문수량</label>
        <div
          class="order-input"
          :class="{ 'order-input--sell-primary': side === 'sell' }"
        >
          <input
            id="order-quantity"
            name="order-quantity"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :value="quantityInput"
            :placeholder="side === 'buy' ? '매수할 수량' : '매도할 수량'"
            :disabled="isBuyLocked"
            @input="updateQuantity"
          >
          <b>{{ symbol }}</b>
          <div class="order-stepper" role="group" aria-label="주문수량 조절">
            <button
              type="button"
              aria-label="주문수량 0.01 감소"
              :disabled="isBuyLocked || parsedQuantity <= 0"
              @click="adjustQuantity(-1)"
            >-</button>
            <button
              type="button"
              aria-label="주문수량 0.01 증가"
              :disabled="isBuyLocked"
              @click="adjustQuantity(1)"
            >+</button>
          </div>
        </div>
      </div>

      <div v-if="!isDirectInput" class="ratio-buttons" aria-label="주문 가능 수량 비율">
        <button
          v-for="ratio in ratioPresets"
          :key="ratio"
          type="button"
          :disabled="isBuyLocked"
          @click="setRatio(ratio)"
        >
          {{ ratio * 100 }}%
        </button>
        <button
          type="button"
          class="ratio-buttons__direct"
          :disabled="isBuyLocked"
          @click="enterDirectInput"
        >
          직접입력
        </button>
      </div>

      <div v-else class="direct-ratio">
        <div class="direct-ratio__head">
          <span>주문 비율</span>
          <strong>{{ directRatio }}%</strong>
          <button type="button" :disabled="isBuyLocked" @click="leaveDirectInput">
            비율 선택
          </button>
        </div>
        <input
          class="direct-ratio__range"
          :class="`direct-ratio__range--${side}`"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="directRatio"
          :style="{ '--range-progress': `${directRatio}%` }"
          aria-label="주문 가능 수량 비율 직접 조절"
          :disabled="isBuyLocked"
          @input="updateDirectRatio"
        >
        <div class="direct-ratio__scale" aria-hidden="true">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="order-total">주문총액</label>
        <div
          class="order-input"
          :class="{ 'order-input--buy-primary': side === 'buy' }"
        >
          <input
            id="order-total"
            name="order-total"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :value="totalInput"
            placeholder="주문할 총액"
            :disabled="isBuyLocked"
            @input="updateTotal"
          >
          <b>KRW</b>
          <div class="order-stepper" role="group" aria-label="주문총액 조절">
            <button
              type="button"
              aria-label="주문총액 0.01 감소"
              :disabled="isBuyLocked || parsedTotal <= 0"
              @click="adjustTotal(-1)"
            >-</button>
            <button
              type="button"
              aria-label="주문총액 0.01 증가"
              :disabled="isBuyLocked"
              @click="adjustTotal(1)"
            >+</button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="localError" class="order-error" role="alert">{{ localError }}</p>

    <button
      class="submit-order"
      :class="`submit-order--${side}`"
      type="button"
      :disabled="!canSubmit"
      @click="submit"
    >
      {{ submitting
        ? "체결 처리 중"
        : isBuyLocked
          ? `${symbol} 매수 완료`
          : `${symbol} ${side === "buy" ? "매수" : "매도"}` }}
    </button>
    <p class="order-note">표시된 시장가로 즉시 체결되며 부분 체결은 없습니다.</p>
  </section>
</template>

<style scoped lang="scss">
.order-panel {
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: clamp(16px, 2vw, 20px);
  background: var(--panel-bg);
}

.order-panel--embedded {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
}

.order-panel--embedded .order-panel__head {
  display: none;
}

.order-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.order-panel__head h2 {
  margin: 0;
}

.order-panel__head h2 {
  @include panel-title(18px);
}

.order-panel__head > span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 750;
}

.side-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: var(--input-bg);
}

.side-tabs button,
.ratio-buttons button {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 9px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.side-tabs button.active:first-child {
  border-color: color-mix(in srgb, var(--c-up) 45%, transparent);
  color: var(--c-up);
  background: var(--c-up-bg);
}

.side-tabs button.active:last-child {
  border-color: color-mix(in srgb, var(--c-down) 45%, transparent);
  color: var(--c-down);
  background: var(--c-down-bg);
}

.order-limit {
  margin: 10px 0 0;
  border: 1px solid color-mix(in srgb, var(--brand-lime) 28%, var(--panel-border));
  border-radius: var(--radius-sm);
  padding: 9px 11px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--c-up-bg) 56%, transparent);
  font-size: 11px;
  font-weight: 750;
  line-height: 1.55;
}

.field {
  display: grid;
  gap: 7px;
  margin-top: 14px;
}

.order-fields {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.order-fields .field {
  margin-top: 0;
}

.account-summary {
  overflow: hidden;
  margin-top: 14px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--input-bg) 62%, var(--panel-bg));
}

.account-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 12px 13px;
  background: var(--input-bg);
}

.account-summary__row {
  min-height: 44px;
  border-top: 1px solid var(--panel-line);
  padding: 10px 13px;
}

.account-summary__label {
  @include muted-label;
  text-transform: none;
}

.account-summary__value {
  color: var(--text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.account-total__value {
  color: var(--text-strong);
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  text-align: right;
}

.selected-asset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field > span,
.field__label {
  @include muted-label;
}

.field select,
.order-input {
  min-height: 46px;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  color: var(--text);
  background: var(--input-bg);
}

.field select {
  width: 100%;
  padding: 0 12px;
  font: inherit;
  font-weight: 750;
}

.account-summary__selector {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-top: 0;
}

.account-summary__selector select {
  min-height: 28px;
  border: 0;
  padding: 0 2px;
  outline: 0;
  color: var(--text);
  background: transparent;
  font-size: 13px;
  text-align: right;
  cursor: pointer;
}

.account-summary__selector select:focus-visible {
  border-radius: 4px;
  outline: 2px solid color-mix(in srgb, var(--panel-border-hover) 55%, transparent);
  outline-offset: 2px;
}

.order-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 0 12px;
}

.order-input input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: var(--text-strong);
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 800;
}

.order-input input::placeholder {
  color: var(--text-dim);
}

.order-input input:disabled {
  color: var(--text-dim);
  cursor: not-allowed;
}

.order-input:focus-within {
  border-color: var(--panel-border-hover);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--panel-border-hover) 22%, transparent);
}

.order-input--buy-primary {
  border-color: color-mix(in srgb, var(--c-up) 36%, var(--input-border));
}

.order-input--sell-primary {
  border-color: color-mix(in srgb, var(--c-down) 36%, var(--input-border));
}

.order-input b {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 12px;
}

.order-stepper {
  align-self: stretch;
  display: grid;
  grid-template-columns: repeat(2, 34px);
  margin-left: 2px;
  border-left: 1px solid var(--input-border);
}

.order-stepper button {
  border: 0;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.order-stepper button + button {
  border-left: 1px solid var(--input-border);
}

.order-stepper button:hover,
.order-stepper button:focus-visible {
  color: var(--text-strong);
  background: color-mix(in srgb, var(--panel-border-hover) 18%, transparent);
  outline: none;
}

.order-stepper button:disabled {
  color: var(--text-dim);
  cursor: not-allowed;
  opacity: 0.45;
}

.order-input--readonly {
  padding-right: 12px;
  background: color-mix(in srgb, var(--input-bg) 72%, var(--panel-bg));
}

.order-input--readonly input {
  color: var(--text-muted);
  cursor: default;
}

.order-input--readonly:focus-within {
  border-color: var(--input-border);
  box-shadow: none;
}

.quote-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
}

.order-availability {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quote-row__price {
  color: var(--text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.quote-row__change {
  min-width: 48px;
  border-radius: 4px;
  padding: 3px 5px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
  font-weight: 800;
}

.order-availability__value {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.order-availability--buy .order-availability__value {
  color: var(--c-up);
}

.order-availability--sell .order-availability__value {
  color: var(--c-down-strong);
}

.is-up {
  color: var(--c-up);
}

.is-down {
  color: var(--c-down-strong);
}

.ratio-buttons {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.ratio-buttons button {
  border-color: var(--panel-border);
  min-width: 0;
  padding: 7px 3px;
  font-size: 11px;
  white-space: nowrap;
}

.ratio-buttons button:hover,
.ratio-buttons button:focus-visible {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
  outline: none;
}

.ratio-buttons button:disabled,
.direct-ratio button:disabled,
.direct-ratio__range:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.ratio-buttons__direct {
  color: var(--text);
}

.direct-ratio {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px 8px;
  background: color-mix(in srgb, var(--input-bg) 78%, transparent);
}

.direct-ratio__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.direct-ratio__head > span {
  @include muted-label;
  margin-right: auto;
  text-transform: none;
}

.direct-ratio__head strong {
  color: var(--text);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.direct-ratio__head button {
  border: 0;
  padding: 2px 0 2px 8px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.direct-ratio__head button:hover,
.direct-ratio__head button:focus-visible {
  color: var(--brand-lime);
  outline: none;
}

.direct-ratio__range {
  --range-accent: var(--c-up);
  width: 100%;
  height: 20px;
  margin: 7px 0 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.direct-ratio__range--sell {
  --range-accent: var(--c-down);
}

.direct-ratio__range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--range-accent) 0 var(--range-progress),
    var(--panel-border) var(--range-progress) 100%
  );
}

.direct-ratio__range::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 3px solid var(--panel-bg);
  border-radius: 50%;
  appearance: none;
  background: var(--range-accent);
  box-shadow: 0 0 0 1px var(--range-accent);
}

.direct-ratio__range::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--panel-border);
}

.direct-ratio__range::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: var(--range-accent);
}

.direct-ratio__range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 3px solid var(--panel-bg);
  border-radius: 50%;
  background: var(--range-accent);
  box-shadow: 0 0 0 1px var(--range-accent);
}

.direct-ratio__range:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--range-accent) 45%, transparent);
  outline-offset: 2px;
}

.direct-ratio__scale {
  display: flex;
  justify-content: space-between;
  color: var(--text-dim);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.order-error {
  margin: 12px 0 0;
  color: var(--alert-text);
  font-size: 12px;
  font-weight: 750;
}

.submit-order {
  width: 100%;
  min-height: 48px;
  margin-top: 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: #10151c;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.submit-order--buy {
  background: var(--brand-lime);
}

.submit-order--sell {
  background: var(--brand-amber);
}

.submit-order:disabled {
  cursor: not-allowed;
  filter: grayscale(0.7);
  opacity: 0.42;
}

.order-note {
  margin: 9px 0 0;
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
}
</style>
