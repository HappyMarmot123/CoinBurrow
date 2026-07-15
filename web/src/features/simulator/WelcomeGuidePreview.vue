<script setup lang="ts">
defineProps<{
  visual: "account" | "order" | "summary";
}>();
</script>

<template>
  <div class="welcome-visual" aria-hidden="true">
    <span class="welcome-visual__caption">PAPER ACCOUNT · KRW</span>
    <Transition name="visual-shift" mode="out-in">
      <div :key="visual" class="welcome-visual__scene">
        <article v-if="visual === 'account'" class="account-preview">
          <span>주문 가능 원화</span>
          <strong>100,000,000<small>원</small></strong>
          <div class="account-preview__rule" />
          <footer>
            <span><i /> 모의 계좌</span>
            <span>실제 출금 불가</span>
          </footer>
        </article>

        <article v-else-if="visual === 'order'" class="order-preview">
          <header>
            <div>
              <span>선택 종목</span>
              <strong>BTC · 비트코인</strong>
            </div>
            <em>LIVE</em>
          </header>
          <div class="order-preview__price">
            <span>현재가</span>
            <strong>148,250,000원</strong>
          </div>
          <div class="order-preview__input">
            <span>주문 수량</span>
            <strong>0.01 BTC</strong>
          </div>
          <div class="order-preview__button">모의 매수</div>
        </article>

        <article v-else class="summary-preview">
          <span>총 자산</span>
          <strong>100,000,000<small>원</small></strong>
          <div class="summary-preview__rows">
            <div><span>통합 손익</span><b>+0원</b></div>
            <div><span>주문 가능 현금</span><b>100,000,000원</b></div>
            <div><span>보유 자산</span><b>0원</b></div>
          </div>
        </article>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.welcome-visual {
  position: relative;
  display: grid;
  min-width: 0;
  place-items: center;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.09);
  padding: 64px 34px 34px;
  background:
    radial-gradient(circle at 50% 48%, rgba(217, 255, 102, 0.16), transparent 38%),
    linear-gradient(155deg, #263348, #111a28 70%);
}

.welcome-visual::before,
.welcome-visual::after {
  position: absolute;
  border: 1px solid rgba(217, 255, 102, 0.11);
  border-radius: 50%;
  content: "";
  pointer-events: none;
}

.welcome-visual::before {
  width: 420px;
  height: 260px;
  transform: rotate(-18deg);
}

.welcome-visual::after {
  width: 520px;
  height: 350px;
  border-color: rgba(255, 176, 46, 0.08);
  transform: rotate(12deg);
}

.welcome-visual__caption {
  position: absolute;
  top: 25px;
  left: 28px;
  z-index: 2;
  color: #8998ad;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.welcome-visual__scene {
  position: relative;
  z-index: 2;
  width: min(100%, 310px);
}

.account-preview,
.order-preview,
.summary-preview {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 22px;
  background: rgba(12, 19, 30, 0.88);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.28);
  font-variant-numeric: tabular-nums;
}

.account-preview > span,
.summary-preview > span,
.order-preview span {
  color: #93a2b7;
  font-size: 10px;
  font-weight: 750;
}

.account-preview > strong,
.summary-preview > strong {
  display: block;
  margin-top: 9px;
  color: #ffffff;
  font-size: clamp(25px, 3vw, 32px);
  letter-spacing: -0.05em;
}

.account-preview strong small,
.summary-preview strong small {
  margin-left: 4px;
  color: #b8c4d3;
  font-size: 13px;
  letter-spacing: 0;
}

.account-preview__rule {
  height: 1px;
  margin: 26px 0 16px;
  background: rgba(255, 255, 255, 0.1);
}

.account-preview footer,
.account-preview footer span {
  display: flex;
  align-items: center;
}

.account-preview footer {
  justify-content: space-between;
  gap: 12px;
  color: #8d9bb0;
  font-size: 10px;
  font-weight: 750;
}

.account-preview footer span {
  gap: 7px;
}

.account-preview footer i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-lime);
  box-shadow: 0 0 0 4px rgba(217, 255, 102, 0.1);
}

.order-preview {
  display: grid;
  gap: 14px;
}

.order-preview header,
.order-preview__price,
.order-preview__input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.order-preview header div {
  display: grid;
  gap: 4px;
}

.order-preview header strong,
.order-preview__price strong,
.order-preview__input strong {
  color: #f5f7fb;
  font-size: 12px;
}

.order-preview header em {
  border: 1px solid rgba(217, 255, 102, 0.28);
  border-radius: 999px;
  padding: 4px 7px;
  color: var(--brand-lime);
  background: rgba(217, 255, 102, 0.08);
  font-size: 8px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.order-preview__price,
.order-preview__input {
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  padding-top: 13px;
}

.order-preview__input {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 7px;
  padding: 11px;
  background: rgba(0, 0, 0, 0.18);
}

.order-preview__button {
  border-radius: 7px;
  padding: 11px;
  color: #172131;
  background: var(--brand-lime);
  font-size: 11px;
  font-weight: 900;
  text-align: center;
}

.summary-preview__rows {
  display: grid;
  margin-top: 22px;
}

.summary-preview__rows div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  padding: 10px 0;
  color: #93a2b7;
  font-size: 10px;
}

.summary-preview__rows b {
  color: #e7edf5;
  font-weight: 800;
}

.summary-preview__rows div:first-child b {
  color: var(--brand-lime);
}

.visual-shift-enter-active,
.visual-shift-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.visual-shift-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.visual-shift-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

@media (max-width: 760px) {
  .welcome-visual {
    min-height: 260px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
    padding: 54px 22px 24px;
  }

  .welcome-visual__scene {
    width: min(100%, 300px);
  }
}

@media (max-width: 420px) {
  .welcome-visual {
    min-height: 230px;
  }

  .account-preview,
  .order-preview,
  .summary-preview {
    padding: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .visual-shift-enter-active,
  .visual-shift-leave-active {
    transition: none;
  }
}
</style>
