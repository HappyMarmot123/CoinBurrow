<script setup lang="ts">
import { computed, onMounted } from "vue";
import AppNav from "../../components/AppNav.vue";
import { useAuthStore } from "../../stores/auth.js";

const authStore = useAuthStore();
const authStatus = computed(() => (authStore.authenticated ? "로그인됨" : "로그인이 필요합니다."));

onMounted(() => {
  void authStore.refreshSession().catch(() => undefined);
});
</script>

<template>
  <main class="mypage-page">
    <AppNav class="mypage-nav" />

    <section class="mypage-shell">
      <header class="mypage-head">
        <p class="mypage-eyebrow">Paper account</p>
        <h1 class="mypage-title">마이페이지</h1>
        <p class="mypage-subtitle">가상 자산 시뮬레이터 계좌 상태와 투자 활동을 확인합니다.</p>
      </header>

      <section class="mypage-grid" aria-label="마이페이지 계좌 요약">
        <article class="mypage-panel" aria-labelledby="mypage-auth-title">
          <div class="mypage-panel__head">
            <span class="mypage-panel__kicker">01</span>
            <h2 id="mypage-auth-title">로그인 상태</h2>
          </div>
          <p class="mypage-panel__body">{{ authStatus }}</p>
        </article>

        <article class="mypage-panel" aria-labelledby="mypage-account-title">
          <div class="mypage-panel__head">
            <span class="mypage-panel__kicker">02</span>
            <h2 id="mypage-account-title">가상 계좌</h2>
          </div>
          <p class="mypage-panel__body">시뮬레이션 잔고와 보유 자산 요약이 이 영역에 표시됩니다.</p>
        </article>

        <article class="mypage-panel" aria-labelledby="mypage-history-title">
          <div class="mypage-panel__head">
            <span class="mypage-panel__kicker">03</span>
            <h2 id="mypage-history-title">투자내역</h2>
          </div>
          <p class="mypage-panel__body">가상 매수와 매도 기록을 준비 중입니다.</p>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
}

.mypage-page {
  min-height: 100svh;
  padding: clamp(8px, 1.4vh, 14px) 0 32px;
  color: var(--text-main, var(--text));
  font-family: $font-sans;
  background:
    radial-gradient(1100px 500px at 50% -120px, var(--bg-glow), transparent 65%),
    linear-gradient(
      to bottom right,
      var(--page-bg, var(--bg-page)),
      var(--bg-page-mid) 38%,
      var(--bg-page-soft) 72%
    );
}

.mypage-nav,
.mypage-shell {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}

.mypage-nav {
  margin-bottom: clamp(8px, 1.2vh, 12px);
}

.mypage-shell {
  display: grid;
  gap: clamp(12px, 2vh, 20px);
  padding: 14px;
}

.mypage-head,
.mypage-panel {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-md);
  background: var(--panel-bg);
}

.mypage-head {
  padding: clamp(16px, 2.6vw, 26px);
}

.mypage-eyebrow {
  margin: 0 0 6px;
  @include muted-label;
  color: var(--brand-lime);
}

.mypage-title {
  margin: 0;
  @include panel-title(22px);
  font-size: clamp(20px, 3vw, 26px);
}

.mypage-subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.3vw, 14px);
}

.mypage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.mypage-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px;
}

.mypage-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mypage-panel__head h2 {
  margin: 0;
  @include panel-title(16px);
}

.mypage-panel__kicker {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--panel-border-hover);
  border-radius: 999px;
  color: var(--brand-lime);
  background: var(--c-up-bg);
  font-size: 11px;
  font-weight: 900;
}

.mypage-panel__body {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 860px) {
  .mypage-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .mypage-nav,
  .mypage-shell {
    width: min(640px, calc(100% - 20px));
  }

  .mypage-shell {
    padding: 10px;
  }
}
</style>
