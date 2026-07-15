<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";

import { useAuthStore } from "../stores/auth.js";

const auth = useAuthStore();
const {
  session,
  initialized,
  loading,
  googleProviderEnabled,
  displayName,
} = storeToRefs(auth);

const authActionLabel = computed(() => {
  if (!initialized.value) return "확인 중";
  if (loading.value) return session.value ? "로그아웃 중" : "로그인 중";
  return session.value ? "로그아웃" : "로그인";
});
const authActionDisabled = computed(() => (
  !initialized.value
  || loading.value
  || (!session.value && (!auth.isConfigured || googleProviderEnabled.value === false))
));
const authActionDescription = computed(() => {
  if (!initialized.value) return "로그인 상태를 확인하고 있습니다.";
  if (!session.value && !auth.isConfigured) return "Supabase 웹 설정이 필요합니다.";
  if (!session.value && googleProviderEnabled.value === false) {
    return "Google 로그인 설정이 필요합니다.";
  }
  return session.value
    ? `${displayName.value} 계정에서 로그아웃`
    : "Google 계정으로 로그인";
});

onMounted(() => {
  void auth.initialize();
});

function handleAuthAction(): void {
  if (authActionDisabled.value) return;
  if (session.value) void auth.signOut();
  else void auth.signInWithGoogle();
}
</script>

<template>
  <nav class="app-nav" aria-label="주요 네비게이션">
    <div class="app-nav__left">
      <router-link to="/" class="app-nav__link app-nav__brand">CoinBurrow</router-link>
    </div>

    <div class="app-nav__right">
      <div class="app-nav__links" aria-label="주요 네비게이션 메뉴">
        <router-link to="/exchange" class="app-nav__link">거래소</router-link>
        <router-link to="/insights" class="app-nav__link">시장 동향</router-link>
        <router-link to="/mypage" class="app-nav__link">마이페이지</router-link>
        <slot name="actions" />
        <button
          class="app-nav__auth"
          type="button"
          :disabled="authActionDisabled"
          :aria-label="authActionDescription"
          :title="authActionDescription"
          @click="handleAuthAction"
        >
          <span class="app-nav__auth-status" :class="{ 'is-online': session }" aria-hidden="true" />
          {{ authActionLabel }}
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.app-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.app-nav__left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.app-nav__links {
  display: flex;
  gap: 8px;
  align-items: center;
}

.app-nav__right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.app-nav__link,
.app-nav__auth {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1;
  font-weight: 850;
  text-decoration: none;
  background: transparent;
  cursor: pointer;
  transition:
    border-color var(--ease),
    color var(--ease),
    background var(--ease);
}

.app-nav__link:hover,
.app-nav__link:focus-visible,
.app-nav__link.router-link-active:not(.app-nav__brand),
.app-nav__link[aria-current="page"] {
  color: var(--brand-lime);
  border-color: var(--panel-border-hover);
  background: var(--panel-bg-strong);
  outline: none;
}

.app-nav__auth {
  gap: 6px;
  min-width: 76px;
  font-family: inherit;
}

.app-nav__auth:hover:not(:disabled),
.app-nav__auth:focus-visible:not(:disabled) {
  border-color: var(--panel-border-hover);
  color: var(--text);
  background: var(--panel-bg-strong);
  outline: none;
}

.app-nav__auth:disabled {
  cursor: wait;
  opacity: 0.55;
}

.app-nav__auth-status {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--text-dim);
}

.app-nav__auth-status.is-online {
  background: var(--c-up);
  box-shadow: 0 0 0 3px var(--c-up-bg);
}

.app-nav__brand {
  border: none;
  padding: 0;
  background: linear-gradient(315deg, #d9ff66, #ffb02e);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter:
    drop-shadow(0 4px 0 rgba(92, 58, 6, 0.28))
    drop-shadow(0 14px 18px rgba(0, 0, 0, 0.22))
    drop-shadow(0 0 18px rgba(255, 176, 46, 0.22));
  font-size: 17px;
  margin: 0;
  font-weight: 900;
  letter-spacing: 0;
}

.app-nav__brand:hover,
.app-nav__brand:focus-visible {
  color: transparent;
  border: none;
  background: linear-gradient(315deg, #d9ff66, #ffb02e);
  background-clip: text;
  -webkit-background-clip: text;
}

@media (max-width: 640px) {
  .app-nav {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .app-nav__left,
  .app-nav__links,
  .app-nav__right {
    width: 100%;
  }

  .app-nav__left {
    width: auto;
    flex-wrap: nowrap;
  }

  .app-nav__links > .app-nav__link,
  .app-nav__links > .app-nav__auth {
    flex: 1 1 0;
    min-width: 0;
    padding-inline: 6px;
    text-align: center;
  }

  .app-nav__right {
    margin-left: 0;
  }
}
</style>
