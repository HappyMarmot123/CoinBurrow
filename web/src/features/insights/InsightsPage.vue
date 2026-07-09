<script setup lang="ts">
import AppNav from "../../components/AppNav.vue";
import GlobalView from "../global/GlobalView.vue";
import SentimentView from "../sentiment/SentimentView.vue";
import KimchiView from "../kimchi/KimchiView.vue";

const insightSections = [
  { label: "시총", description: "글로벌 유동성" },
  { label: "심리", description: "공포·탐욕" },
  { label: "김치프리미엄", description: "국내외 괴리" },
];
</script>

<template>
  <main class="insights-page">
    <AppNav class="insights-nav" />

    <section class="insights-shell">
      <header class="insights-head">
        <div class="insights-head__copy">
          <p class="insights-eyebrow">Market pulse</p>
          <h1 class="insights-head__title">시장 동향</h1>
          <p class="insights-head__sub">암호화폐 시장 전체를 한눈에 — 시총·심리·김치프리미엄</p>
        </div>
        <ul class="insights-pillbar" aria-label="시장 동향 구성">
          <li v-for="section in insightSections" :key="section.label" class="insights-pill">
            <strong>{{ section.label }}</strong>
            <span>{{ section.description }}</span>
          </li>
        </ul>
      </header>

      <div class="insights-stack">
        <section class="insights-section" aria-labelledby="insights-global-title">
          <div class="insights-section__head">
            <span class="insights-section__kicker">01</span>
            <h2 id="insights-global-title">글로벌 시총</h2>
          </div>
          <GlobalView />
        </section>
        <section class="insights-section" aria-labelledby="insights-sentiment-title">
          <div class="insights-section__head">
            <span class="insights-section__kicker">02</span>
            <h2 id="insights-sentiment-title">시장 심리</h2>
          </div>
          <SentimentView />
        </section>
        <section class="insights-section" aria-labelledby="insights-kimchi-title">
          <div class="insights-section__head">
            <span class="insights-section__kicker">03</span>
            <h2 id="insights-kimchi-title">김치프리미엄</h2>
          </div>
          <KimchiView />
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) {
  margin: 0;
}

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
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto clamp(8px, 1.2vh, 12px);
}

.insights-shell {
  display: grid;
  gap: clamp(12px, 2vh, 20px);
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 14px;
}

.insights-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(14px, 2vw, 24px);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: clamp(16px, 2.6vw, 26px);
  overflow: hidden;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--brand-lime) 18%, transparent), transparent 34%),
    var(--panel-bg);
}

.insights-head::after {
  position: absolute;
  inset: auto 18px 18px auto;
  width: 120px;
  height: 120px;
  border: 1px solid color-mix(in srgb, var(--panel-border-hover) 58%, transparent);
  border-radius: 999px;
  content: "";
  opacity: 0.34;
  pointer-events: none;
}

.insights-head__copy {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.insights-eyebrow {
  margin: 0 0 6px;
  @include muted-label;
  color: var(--brand-lime);
}

.insights-head__title {
  margin: 0;
  @include panel-title(22px);
  font-size: clamp(20px, 3vw, 26px);
}

.insights-head__sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.3vw, 14px);
}

.insights-pillbar {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 520px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.insights-pill {
  min-width: 126px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  padding: 9px 11px;
  background: var(--panel-bg-strong);
}

.insights-pill strong,
.insights-pill span {
  display: block;
}

.insights-pill strong {
  color: var(--text);
  font-size: 13px;
}

.insights-pill span {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

// 그리드로 스택 — SentimentView 루트의 flex:1(구 풀높이 페이지 잔재)이
// flex 컨테이너에서 높이를 왜곡하지 않도록 grid item으로 둔다(콘텐츠 높이).
.insights-stack {
  display: grid;
  gap: clamp(12px, 2vh, 20px);
}

.insights-section {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.insights-section__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.insights-section__head h2 {
  margin: 0;
  @include panel-title(16px);
}

.insights-section__kicker {
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

@media (max-width: 760px) {
  .insights-nav,
  .insights-shell {
    width: min(760px, calc(100% - 24px));
  }

  .insights-head {
    align-items: stretch;
    flex-direction: column;
  }

  .insights-pillbar {
    justify-content: stretch;
    max-width: none;
  }

  .insights-pill {
    flex: 1 1 150px;
  }
}

@media (max-width: 520px) {
  .insights-page {
    padding-top: 10px;
  }

  .insights-shell {
    padding: 10px;
  }

  .insights-pill {
    min-width: 0;
    flex-basis: 100%;
  }
}
</style>
