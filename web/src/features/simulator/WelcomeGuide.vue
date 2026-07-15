<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  shallowRef,
  useTemplateRef,
} from "vue";

import WelcomeGuidePreview from "./WelcomeGuidePreview.vue";

const props = withDefaults(defineProps<{
  displayName: string;
  saving?: boolean;
  error?: string;
}>(), {
  saving: false,
  error: "",
});

const emit = defineEmits<{
  finish: [];
}>();

const steps = [
  {
    label: "계좌 준비",
    eyebrow: "첫 모의 계좌",
    title: "1억원으로 부담 없이 시작하세요",
    description: "가입과 함께 가상 원화 1억원이 준비됩니다. 실제 자산이나 입출금과는 연결되지 않습니다.",
    note: "모든 주문은 연습용 계좌 안에서만 처리됩니다.",
    visual: "account",
  },
  {
    label: "모의 주문",
    eyebrow: "거래하는 방법",
    title: "종목을 고르고 수량만 입력하세요",
    description: "거래소에서 비트코인 또는 이더리움을 선택한 뒤 모의 주문에서 매수와 매도를 실행합니다.",
    note: "체결 가격은 주문하는 순간의 Upbit 시세로 결정됩니다.",
    visual: "order",
  },
  {
    label: "결과 확인",
    eyebrow: "마이페이지",
    title: "자산과 손익을 한곳에서 확인하세요",
    description: "총 자산, 통합 손익, 주문 가능 현금과 보유 수량을 마이페이지에서 확인할 수 있습니다.",
    note: "처음부터 다시 연습하고 싶다면 계좌 초기화를 사용하세요.",
    visual: "summary",
  },
] as const;

const currentIndex = shallowRef(0);
const dialogRef = useTemplateRef<HTMLElement>("dialog");
const headingRef = useTemplateRef<HTMLElement>("heading");
const currentStep = computed(() => steps[currentIndex.value]);
const isFirstStep = computed(() => currentIndex.value === 0);
const isLastStep = computed(() => currentIndex.value === steps.length - 1);
const currentTitle = computed(() => (
  isFirstStep.value
    ? `${props.displayName}님, 모의 계좌가 준비됐어요`
    : currentStep.value.title
));

let previousActiveElement: HTMLElement | null = null;
let previousBodyOverflow = "";

function previousStep(): void {
  if (!isFirstStep.value) currentIndex.value -= 1;
}

function nextStep(): void {
  if (isLastStep.value) {
    finishGuide();
    return;
  }
  currentIndex.value += 1;
}

function finishGuide(): void {
  if (!props.saving) emit("finish");
}

function focusHeading(): void {
  headingRef.value?.focus();
}

function focusableElements(): HTMLElement[] {
  const dialog = dialogRef.value;
  if (!dialog) return [];

  return Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  ));
}

function handleDialogKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    finishGuide();
    return;
  }
  if (event.key !== "Tab") return;

  const elements = focusableElements();
  if (elements.length === 0) {
    event.preventDefault();
    dialogRef.value?.focus();
    return;
  }

  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

onMounted(() => {
  previousActiveElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.requestAnimationFrame(() => dialogRef.value?.focus());
});

onUnmounted(() => {
  document.body.style.overflow = previousBodyOverflow;
  previousActiveElement?.focus();
});
</script>

<template>
  <Teleport to="body">
    <div class="welcome-layer">
      <section
        ref="dialog"
        class="welcome-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-guide-title"
        aria-describedby="welcome-guide-description"
        tabindex="-1"
        @keydown="handleDialogKeydown"
      >
        <header class="welcome-dialog__header">
          <div class="welcome-brand" aria-label="CoinBurrow">
            <span class="welcome-brand__mark" aria-hidden="true">CB</span>
            <span>CoinBurrow</span>
          </div>
          <button
            class="welcome-skip"
            type="button"
            :disabled="props.saving"
            @click="finishGuide"
          >
            건너뛰기
          </button>
        </header>

        <div class="welcome-dialog__body">
          <WelcomeGuidePreview :visual="currentStep.visual" />

          <div class="welcome-copy">
            <div class="welcome-progress" aria-label="가입 안내 진행 단계">
              <ol>
                <li
                  v-for="(step, index) in steps"
                  :key="step.label"
                  :class="{
                    'is-current': index === currentIndex,
                    'is-complete': index < currentIndex,
                  }"
                  :aria-current="index === currentIndex ? 'step' : undefined"
                >
                  <span>{{ index + 1 }}</span>
                  <small>{{ step.label }}</small>
                </li>
              </ol>
            </div>

            <Transition name="copy-shift" mode="out-in" @after-enter="focusHeading">
              <div :key="currentIndex" class="welcome-copy__content">
                <span class="welcome-copy__eyebrow">{{ currentStep.eyebrow }}</span>
                <h2 id="welcome-guide-title" ref="heading" tabindex="-1">
                  {{ currentTitle }}
                </h2>
                <p id="welcome-guide-description">{{ currentStep.description }}</p>
                <p class="welcome-copy__note">
                  <span aria-hidden="true">i</span>
                  {{ currentStep.note }}
                </p>
              </div>
            </Transition>

            <p v-if="props.error" class="welcome-error" role="alert">{{ props.error }}</p>

            <footer class="welcome-actions">
              <button
                v-if="!isFirstStep"
                class="welcome-actions__back"
                type="button"
                :disabled="props.saving"
                @click="previousStep"
              >
                이전
              </button>
              <span v-else class="welcome-actions__spacer" aria-hidden="true" />
              <button
                class="welcome-actions__next"
                type="button"
                :disabled="props.saving"
                @click="nextStep"
              >
                {{ props.saving ? "저장 중" : isLastStep ? "가이드 마치기" : "다음" }}
              </button>
            </footer>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.welcome-layer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(5, 9, 15, 0.82);
  backdrop-filter: blur(10px);
  animation: welcome-layer-in 220ms ease-out both;
}

.welcome-dialog {
  width: min(920px, 100%);
  overflow: hidden;
  border: 1px solid rgba(217, 255, 102, 0.2);
  border-radius: 14px;
  color: var(--text);
  background: #172131;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.48);
  font-family: $font-sans;
  animation: welcome-dialog-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.welcome-dialog:focus {
  outline: none;
}

.welcome-dialog__header {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  padding: 0 24px;
}

.welcome-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
}

.welcome-brand__mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  color: #172131;
  background: var(--brand-lime);
  box-shadow: inset 0 -4px 0 rgba(77, 105, 29, 0.24);
  font-size: 10px;
  letter-spacing: -0.05em;
}

.welcome-skip,
.welcome-actions button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.welcome-skip {
  padding: 8px 2px;
  color: var(--text-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 800;
}

.welcome-skip:hover,
.welcome-skip:focus-visible {
  color: var(--brand-lime);
}

.welcome-dialog__body {
  display: grid;
  grid-template-columns: minmax(320px, 0.92fr) minmax(0, 1.08fr);
  min-height: 500px;
}

.welcome-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 34px clamp(28px, 4vw, 46px) 36px;
}

.welcome-progress ol {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

.welcome-progress li {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 7px;
  color: #718198;
}

.welcome-progress li::after {
  position: absolute;
  top: 11px;
  right: 8px;
  left: 31px;
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  content: "";
}

.welcome-progress li:last-child::after {
  display: none;
}

.welcome-progress li > span {
  position: relative;
  z-index: 1;
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  background: #172131;
  font-size: 9px;
  font-weight: 900;
}

.welcome-progress li small {
  font-size: 9px;
  font-weight: 800;
}

.welcome-progress li.is-current,
.welcome-progress li.is-complete {
  color: var(--brand-lime);
}

.welcome-progress li.is-current > span {
  border-color: var(--brand-lime);
  color: #172131;
  background: var(--brand-lime);
}

.welcome-progress li.is-complete > span {
  border-color: rgba(217, 255, 102, 0.48);
}

.welcome-progress li.is-complete::after {
  background: rgba(217, 255, 102, 0.42);
}

.welcome-copy__content {
  min-height: 270px;
  padding-top: clamp(42px, 7vh, 66px);
}

.welcome-copy__eyebrow {
  display: block;
  margin-bottom: 12px;
  color: var(--brand-lime);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.welcome-copy h2 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(25px, 3vw, 34px);
  line-height: 1.22;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.welcome-copy h2:focus {
  outline: none;
}

.welcome-copy__content > p:not(.welcome-copy__note) {
  margin: 18px 0 0;
  color: #aab7c9;
  font-size: 14px;
  line-height: 1.75;
  text-wrap: pretty;
}

.welcome-copy__note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 18px 0 0;
  color: #8392a8;
  font-size: 11px;
  line-height: 1.6;
}

.welcome-copy__note span {
  display: grid;
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  color: #b9c4d3;
  font-size: 9px;
  font-weight: 900;
}

.welcome-error {
  margin: 0 0 14px;
  border: 1px solid var(--alert-border);
  border-radius: 7px;
  padding: 9px 11px;
  color: var(--alert-text);
  background: var(--alert-bg);
  font-size: 11px;
  line-height: 1.5;
}

.welcome-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}

.welcome-actions__spacer {
  width: 1px;
}

.welcome-actions button {
  min-height: 44px;
  border-radius: 8px;
  padding: 0 18px;
  font-size: 12px;
  font-weight: 900;
}

.welcome-actions__back {
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  color: #b6c1d0;
  background: transparent;
}

.welcome-actions__next {
  min-width: 126px;
  color: #172131;
  background: var(--brand-lime);
}

.welcome-actions button:hover:not(:disabled),
.welcome-actions button:focus-visible:not(:disabled) {
  transform: translateY(-1px);
}

.welcome-skip:focus-visible,
.welcome-actions button:focus-visible {
  outline: 3px solid rgba(217, 255, 102, 0.2);
  outline-offset: 3px;
}

.welcome-skip:disabled,
.welcome-actions button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.copy-shift-enter-active,
.copy-shift-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.copy-shift-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.copy-shift-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

@keyframes welcome-layer-in {
  from { opacity: 0; }
}

@keyframes welcome-dialog-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.985);
  }
}

@media (max-width: 760px) {
  .welcome-layer {
    place-items: start center;
    padding: 12px;
  }

  .welcome-dialog__header {
    min-height: 56px;
    padding: 0 18px;
  }

  .welcome-dialog__body {
    grid-template-columns: 1fr;
  }

  .welcome-copy {
    padding: 26px 22px 24px;
  }

  .welcome-copy__content {
    min-height: 240px;
    padding-top: 34px;
  }
}

@media (max-width: 420px) {
  .welcome-layer {
    padding: 0;
  }

  .welcome-dialog {
    min-height: 100svh;
    border: 0;
    border-radius: 0;
  }

  .welcome-copy {
    padding-inline: 18px;
  }

  .welcome-copy__content {
    min-height: 230px;
  }

  .welcome-progress li small {
    font-size: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-layer,
  .welcome-dialog {
    animation: none;
  }

  .copy-shift-enter-active,
  .copy-shift-leave-active {
    transition: none;
  }
}
</style>
