<script setup lang="ts">
import AppNav from "../../components/AppNav.vue";
import GlobalView from "../global/GlobalView.vue";
import SentimentView from "../sentiment/SentimentView.vue";
import KimchiView from "../kimchi/KimchiView.vue";
</script>

<template>
  <main class="insights-page">
    <AppNav class="insights-nav" />

    <section class="insights-shell">
      <header class="insights-head">
        <h1>시장 동향</h1>
        <p class="insights-head__sub">암호화폐 시장 전체를 한눈에 — 시총·심리·김치프리미엄</p>
      </header>

      <div class="insights-stack">
        <GlobalView />
        <SentimentView />
        <KimchiView />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) { margin: 0; }
.insights-page {
  min-height: 100svh;
  padding: clamp(8px, 1.4vh, 14px) 0;
  color: var(--text);
  font-family: $font-sans;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1100px 500px at 50% -120px, var(--bg-glow), transparent 65%),
    linear-gradient(to bottom right, var(--bg-page), var(--bg-page-mid) 38%, var(--bg-page-soft) 72%);
}
.insights-nav {
  flex: 0 0 auto;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto clamp(8px, 1.2vh, 12px);
}
.insights-shell {
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  padding: 14px;
}
.insights-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: clamp(10px, 1.6vh, 16px);
}
.insights-head h1 {
  @include panel-title(22px);
  font-size: clamp(20px, 3vw, 26px);
}
.insights-head__sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.3vw, 14px);
}
// 그리드로 스택 — SentimentView 루트의 flex:1(구 풀높이 페이지 잔재)이
// flex 컨테이너에서 높이를 왜곡하지 않도록 grid item으로 둔다(콘텐츠 높이).
.insights-stack {
  display: grid;
  gap: clamp(12px, 2vh, 20px);
}

@media (max-width: 640px) {
  .insights-nav,
  .insights-shell {
    width: min(640px, calc(100% - 20px));
  }

  .insights-shell {
    padding: 10px 0 18px;
  }

  .insights-head {
    margin-bottom: 12px;
  }

  .insights-stack {
    gap: clamp(12px, 4vw, 16px);
  }
}
</style>

<style scoped lang="scss">
@media (max-width: 640px) {
  .insights-nav,
  .insights-shell {
    width: min(370px, calc(100% - 20px));
    margin-left: 10px;
    margin-right: auto;
  }

  .insights-shell,
  .insights-stack,
  .insights-stack > * {
    max-width: 100%;
    min-width: 0;
  }

  .insights-shell {
    overflow-x: hidden;
  }
}
</style>
