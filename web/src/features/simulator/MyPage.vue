<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";

import AppNav from "../../components/AppNav.vue";
import { useSimulatorAccount } from "../../composables/useSimulatorAccount.js";
import SimulatorPositions from "./SimulatorPositions.vue";
import SimulatorSummary from "./SimulatorSummary.vue";
import WelcomeGuide from "./WelcomeGuide.vue";

const {
  session,
  initialized,
  authLoading,
  authError,
  googleProviderEnabled,
  welcomeGuideVisible,
  welcomeGuideSaving,
  welcomeGuideError,
  displayName,
  state,
  simulatorLoading,
  submitting,
  simulatorError,
  notice,
  isConfigured,
  signInWithGoogle,
  completeWelcomeGuide,
  reload,
  resetAccount,
} = useSimulatorAccount();

const resetConfirmationVisible = shallowRef(false);
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const asOfLabel = computed(() => (
  state.value ? timeFormatter.format(new Date(state.value.asOf)) : ""
));

watch(
  () => session.value?.access_token,
  () => {
    resetConfirmationVisible.value = false;
  },
);

async function confirmResetAccount(): Promise<void> {
  if (!resetConfirmationVisible.value) {
    resetConfirmationVisible.value = true;
    return;
  }

  if (await resetAccount()) {
    resetConfirmationVisible.value = false;
  }
}

function finishWelcomeGuide(): void {
  void completeWelcomeGuide();
}
</script>

<template>
  <main class="mypage">
    <AppNav class="mypage-nav" />

    <WelcomeGuide
      v-if="welcomeGuideVisible && session"
      :display-name="displayName"
      :saving="welcomeGuideSaving"
      :error="welcomeGuideError"
      @finish="finishWelcomeGuide"
    />

    <section class="mypage-shell">
      <header class="mypage-heading">
        <h1>마이페이지</h1>
        <p>모의 계좌의 자산과 보유 내역을 확인합니다.</p>
      </header>

      <section v-if="!initialized" class="state-panel" aria-live="polite">
        <span class="loader" aria-hidden="true" />
        <strong>로그인 상태를 확인하고 있습니다.</strong>
      </section>

      <section v-else-if="!isConfigured" class="state-panel state-panel--error">
        <strong>Supabase 웹 설정이 필요합니다.</strong>
        <p><code>VITE_SUPABASE_URL</code>과 publishable 또는 anon key를 확인해 주세요.</p>
      </section>

      <section v-else-if="!session" class="login-panel">
        <div class="login-panel__copy">
          <h2>내 모의 계좌 확인하기</h2>
          <p>Google 계정으로 로그인하면 자산과 보유 내역을 확인할 수 있습니다.</p>
        </div>
        <button
          type="button"
          :disabled="authLoading || googleProviderEnabled === false"
          @click="signInWithGoogle"
        >
          {{ authLoading
            ? "로그인 준비 중"
            : googleProviderEnabled === false
              ? "Google 로그인 설정 필요"
              : "Google 계정으로 로그인" }}
        </button>
        <p v-if="authError" class="feedback feedback--error" role="alert">{{ authError }}</p>
      </section>

      <template v-else>
        <div class="account-strip">
          <div class="account-strip__identity">
            <span class="account-strip__status" aria-hidden="true" />
            <div>
              <span>모의 계좌</span>
              <strong>{{ displayName }}</strong>
            </div>
          </div>
          <div class="account-strip__actions">
            <span v-if="state">시세 기준 {{ asOfLabel }}</span>
            <router-link class="account-strip__trade" to="/exchange">거래소에서 주문</router-link>
            <button type="button" :disabled="submitting" @click="confirmResetAccount">
              {{ resetConfirmationVisible ? "한 번 더 눌러 초기화" : "계좌 초기화" }}
            </button>
          </div>
        </div>

        <p v-if="simulatorError" class="feedback feedback--error" role="alert">
          {{ simulatorError }}
          <button type="button" @click="reload">다시 시도</button>
        </p>
        <p v-if="notice" class="feedback feedback--success" role="status">{{ notice }}</p>

        <section v-if="simulatorLoading && !state" class="state-panel" aria-live="polite">
          <span class="loader" aria-hidden="true" />
          <strong>모의 계좌와 현재가를 불러오고 있습니다.</strong>
        </section>

        <template v-else-if="state">
          <SimulatorSummary :account="state.account" />
          <SimulatorPositions :positions="state.positions" />
        </template>
      </template>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
}

:global(*) {
  box-sizing: border-box;
}

.mypage {
  min-height: 100svh;
  padding: 14px 0 56px;
  color: var(--text);
  font-family: $font-sans;
  background:
    radial-gradient(circle at 50% -180px, rgba(95, 141, 78, 0.14), transparent 520px),
    linear-gradient(180deg, var(--bg-page), #151c29 55%, var(--bg-page));
}

.mypage-nav,
.mypage-shell {
  width: min(1120px, calc(100% - 32px));
  margin-inline: auto;
}

.mypage-shell {
  display: grid;
  gap: 16px;
}

.account-strip button,
.account-strip__trade,
.feedback button {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  transition: border-color var(--ease), color var(--ease), background var(--ease);
}

.account-strip button:hover,
.account-strip__trade:hover,
.feedback button:hover {
  border-color: var(--panel-border-hover);
  color: var(--brand-lime);
}

.mypage-heading {
  padding: clamp(38px, 7vw, 72px) 20px 22px;
  text-align: center;
}

.mypage-heading h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.04em;
}

.mypage-heading p {
  max-width: 560px;
  margin: 11px auto 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.65;
}

.account-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-block: 1px solid var(--panel-line);
  padding: 12px 2px;
}

.account-strip__identity,
.account-strip__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-strip__identity > div {
  display: grid;
  gap: 2px;
}

.account-strip__status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-up);
  box-shadow: 0 0 0 4px var(--c-up-bg);
}

.account-strip span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 750;
}

.account-strip strong {
  color: var(--text);
  font-size: 13px;
}

.state-panel,
.login-panel {
  width: min(100%, 600px);
  min-height: 230px;
  margin-inline: auto;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: clamp(26px, 5vw, 40px);
  text-align: center;
  background: var(--panel-bg);
}

.state-panel {
  display: grid;
  place-content: center;
  gap: 14px;
}

.state-panel strong {
  color: var(--text);
}

.state-panel p {
  margin: 0;
  color: var(--text-muted);
}

.state-panel--error {
  border-color: var(--alert-border);
  background: var(--alert-bg);
}

.loader {
  width: 30px;
  height: 30px;
  margin: 0 auto;
  border: 3px solid var(--panel-border);
  border-top-color: var(--brand-lime);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.login-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.login-panel__copy h2,
.login-panel__copy p {
  margin: 0;
}

.login-panel__copy h2 {
  @include panel-title(22px);
}

.login-panel__copy p {
  max-width: 400px;
  margin-top: 9px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.login-panel > button {
  width: min(100%, 320px);
  min-height: 46px;
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0 18px;
  color: #111827;
  background: var(--brand-lime);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.login-panel > button:hover,
.login-panel > button:focus-visible {
  background: #e3ff8a;
  outline: 3px solid color-mix(in srgb, var(--brand-lime) 22%, transparent);
  outline-offset: 2px;
}

.feedback {
  margin: 0;
  border: 1px solid;
  border-radius: var(--radius-sm);
  padding: 11px 13px;
  font-size: 12px;
  font-weight: 750;
}

.feedback--error {
  border-color: var(--alert-border);
  color: var(--alert-text);
  background: var(--alert-bg);
}

.feedback--success {
  border-color: color-mix(in srgb, var(--c-up) 38%, transparent);
  color: var(--c-up);
  background: var(--c-up-bg);
}

.login-panel .feedback {
  width: 100%;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 680px) {
  .mypage-nav,
  .mypage-shell {
    width: min(680px, calc(100% - 20px));
  }

  .mypage-heading {
    padding: 34px 12px 16px;
  }

  .account-strip,
  .account-strip__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .account-strip {
    padding: 12px 0;
  }

  .account-strip__actions {
    gap: 8px;
  }

  .account-strip__actions button,
  .account-strip__trade {
    width: 100%;
    text-align: center;
  }

  .state-panel,
  .login-panel {
    min-height: 210px;
  }
}
</style>
