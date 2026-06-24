# 시장 동향 허브 (Market Insights Hub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시장심리·김치프리미엄·글로벌시총 3개 독립 페이지를 단일 네비 메뉴 "시장 동향"(`/insights`) 아래 탭 통합 허브로 합치고, 일관된 UI/UX(접근성 탭바·공유 셸·KimchiView 스타일 명충)를 구현한다.

**Architecture:** Vue 중첩 라우트로 `/insights` 부모(InsightsPage = 셸: AppNav + 허브 헤더 + 접근성 탭바 + `<router-view>`) 아래 3개 자식 뷰(GlobalView/SentimentView/KimchiView)를 둔다. 기존 페이지의 콘텐츠를 뷰로 추출하고, AppNav·핫알림 로직은 허브로 승격(핫알림은 `useHotAlerts` 컴포저블로 추출). 기존 경로는 새 경로로 redirect.

**Tech Stack:** Vue 3 `<script setup lang="ts">` + Composition API, vue-router 중첩 라우트, Pinia, SCSS(기존 디자인 토큰/믹스인 재사용), Vitest + @vue/test-utils.

## Global Constraints

- 모든 신규 컴포넌트는 `<script setup lang="ts">` + Composition API. SFC 순서 `<script>`→`<template>`→`<style>`.
- 라우트 뷰/부모는 얇은 컴포지션 표면 유지; 부수효과 많은 로직은 컴포저블로 추출.
- 새 팔레트 금지 — 기존 토큰(`_variables.scss`)·믹스인(`@include exchange-panel/panel-head/panel-title`)만 사용.
- 접근성 필수: 탭바는 `role="tablist"`/`role="tab"`, `aria-selected`, 좌우/Home/End 키보드 이동, `:focus-visible` 링, 색 외 신호(degraded amber 점), `prefers-reduced-motion` 존중.
- 메뉴명(네비·허브 헤더): **시장 동향**. 기본 탭: **글로벌 시총**(`/insights` 진입 시 `/insights/global`로 redirect).
- 탭 라벨: 글로벌 시총 / 시장심리 / 김치프리미엄. 라우트명: `insights-global` / `insights-sentiment` / `insights-kimchi`.
- 기존 경로 호환: `/global`→`/insights/global`, `/sentiment`→`/insights/sentiment`, `/kimchi`→`/insights/kimchi` redirect 유지.
- 모든 사용자 노출 텍스트는 한국어.
- 숫자 컬럼은 tabular-nums. 반응형 375px 이상 깨짐 없음.

---

### Task 1: 접근성 탭바 컴포넌트 `InsightsTabs`

**Files:**
- Create: `web/src/features/insights/InsightsTabs.vue`
- Test: `web/test/insights-tabs.test.ts`

**Interfaces:**
- Consumes: vue-router `useRouter` (navigation), `RouterLink`.
- Produces:
  - `InsightTab` 타입: `{ key: string; label: string; to: string; degraded?: boolean }`
  - 컴포넌트 props: `tabs: InsightTab[]`, `activeKey: string`
  - 동작: 각 탭은 `<RouterLink role="tab" :to>`; 활성 탭만 `tabindex=0`(나머지 -1); ←/→/Home/End로 탭 간 포커스 이동 + 해당 탭으로 router 이동; 활성 인덱스 기반 슬라이딩 언더라인.

- [ ] **Step 1: 실패 테스트 작성** — `web/test/insights-tabs.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createWebHistory } from "vue-router";
import InsightsTabs from "../src/features/insights/InsightsTabs.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/insights/global", component: { template: "<div/>" } },
    { path: "/insights/sentiment", component: { template: "<div/>" } },
    { path: "/insights/kimchi", component: { template: "<div/>" } },
  ],
});

const tabs = [
  { key: "global", label: "글로벌 시총", to: "/insights/global" },
  { key: "sentiment", label: "시장심리", to: "/insights/sentiment", degraded: true },
  { key: "kimchi", label: "김치프리미엄", to: "/insights/kimchi" },
];

describe("InsightsTabs", () => {
  it("renders a tablist with one tab per item and marks the active tab", async () => {
    const wrapper = mount(InsightsTabs, {
      props: { tabs, activeKey: "global" },
      global: { plugins: [router] },
    });
    await router.isReady();

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
    const tabEls = wrapper.findAll('[role="tab"]');
    expect(tabEls).toHaveLength(3);
    expect(tabEls[0].attributes("aria-selected")).toBe("true");
    expect(tabEls[1].attributes("aria-selected")).toBe("false");
    expect(tabEls[0].attributes("tabindex")).toBe("0");
    expect(tabEls[1].attributes("tabindex")).toBe("-1");
    expect(tabEls[0].text()).toContain("글로벌 시총");
  });

  it("renders a degraded indicator dot for degraded tabs", () => {
    const wrapper = mount(InsightsTabs, {
      props: { tabs, activeKey: "global" },
      global: { plugins: [router] },
    });
    expect(wrapper.find(".insights-tabs__dot").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `cd web && npx vitest run test/insights-tabs.test.ts`
Expected: FAIL — `Failed to resolve import ".../InsightsTabs.vue"`.

- [ ] **Step 3: 컴포넌트 구현** — `web/src/features/insights/InsightsTabs.vue`

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

export interface InsightTab {
  key: string;
  label: string;
  to: string;
  degraded?: boolean;
}

const props = defineProps<{ tabs: InsightTab[]; activeKey: string }>();
const router = useRouter();

const activeIndex = computed(() =>
  Math.max(0, props.tabs.findIndex((t) => t.key === props.activeKey)),
);

const indicatorStyle = computed(() => ({
  width: `${100 / props.tabs.length}%`,
  transform: `translateX(${activeIndex.value * 100}%)`,
}));

function focusTab(index: number, el: HTMLElement) {
  const list = el.closest('[role="tablist"]');
  const target = list?.querySelectorAll<HTMLElement>('[role="tab"]')[index];
  target?.focus();
}

function onKeydown(event: KeyboardEvent, index: number) {
  const last = props.tabs.length - 1;
  let next = index;
  if (event.key === "ArrowRight") next = index >= last ? 0 : index + 1;
  else if (event.key === "ArrowLeft") next = index <= 0 ? last : index - 1;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = last;
  else return;
  event.preventDefault();
  focusTab(next, event.currentTarget as HTMLElement);
  void router.push(props.tabs[next].to);
}
</script>

<template>
  <div class="insights-tabs" role="tablist" aria-label="시장 동향 지표 선택">
    <RouterLink
      v-for="(tab, index) in tabs"
      :key="tab.key"
      :to="tab.to"
      role="tab"
      class="insights-tabs__tab"
      :class="{ 'is-active': tab.key === activeKey }"
      :aria-selected="tab.key === activeKey ? 'true' : 'false'"
      :tabindex="tab.key === activeKey ? 0 : -1"
      @keydown="onKeydown($event, index)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.degraded" class="insights-tabs__dot" aria-hidden="true" />
    </RouterLink>
    <span class="insights-tabs__indicator" :style="indicatorStyle" aria-hidden="true" />
  </div>
</template>

<style scoped lang="scss">
.insights-tabs {
  position: relative;
  display: flex;
  border-bottom: 1px solid var(--panel-border);
}

.insights-tabs__tab {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 10px;
  color: var(--text-muted);
  font-size: clamp(13px, 1.5vw, 15px);
  font-weight: 850;
  text-decoration: none;
  background: transparent;
  cursor: pointer;
  transition: color var(--ease);
}

.insights-tabs__tab:hover,
.insights-tabs__tab.is-active {
  color: var(--brand-lime);
}

.insights-tabs__tab:focus-visible {
  outline: 2px solid var(--panel-border-hover);
  outline-offset: -2px;
  border-radius: var(--radius-sm);
}

.insights-tabs__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--c-down);
}

.insights-tabs__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--brand-lime);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .insights-tabs__indicator {
    transition: none;
  }
}
</style>
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `cd web && npx vitest run test/insights-tabs.test.ts`
Expected: 2 passed.

- [ ] **Step 5: 타입 체크 + 커밋**

```bash
cd web && npx vue-tsc --noEmit
git add web/src/features/insights/InsightsTabs.vue web/test/insights-tabs.test.ts
git commit -m "feat(insights): add accessible InsightsTabs component"
```

---

### Task 2: 3개 뷰 추출 (GlobalView/SentimentView/KimchiView) + 기존 페이지를 thin wrapper로

**Files:**
- Create: `web/src/features/global/GlobalView.vue`
- Create: `web/src/features/sentiment/SentimentView.vue`
- Create: `web/src/features/kimchi/KimchiView.vue`
- Modify: `web/src/features/global/GlobalPage.vue` (thin wrapper)
- Modify: `web/src/features/kimchi/KimchiPage.vue` (thin wrapper)
- Modify: `web/test/global-page.test.ts` (대상을 GlobalView로 변경)
- (SentimentPage.vue는 이 태스크에서 변경하지 않음 — Step 4 참고)

**Interfaces:**
- Consumes: `useGlobalStore`, `useSentimentStore`, `useKimchiStore`, `useFxStore`, `useMarketSocket`, `useBinanceSocket`, `KimchiTable`, `formatCompact`, `formatNumber`.
- Produces: `GlobalView`, `SentimentView`, `KimchiView` — **콘텐츠 전용**(AppNav·풀스크린 셸·배경 없음). 각자 onMounted에서 데이터 로드, onBeforeUnmount에서 정리. 부모(InsightsPage, Task 3)가 제공하는 `.insights-body` 컨테이너(폭/패딩) 안에서 패널만 렌더.

목표: 콘텐츠 로직을 뷰로 옮기고, 기존 `*Page.vue`는 셸(AppNav+배경)만 두고 뷰를 합성하는 thin wrapper로 만들어 **로직 중복 없이** 기존 `/global`·`/sentiment`·`/kimchi` 경로가 그대로 동작하게 한다. (Task 3 cutover에서 wrapper와 구 라우트는 제거된다.)

- [ ] **Step 1: GlobalView 생성** — `web/src/features/global/GlobalView.vue`

`GlobalPage.vue`의 `<script setup>` 전체를 복사하되 다음만 변경:
- import에서 `AppNav` 제거.
- 나머지(REFRESH_INTERVAL_MS, useGlobalStore, poll 로직, computed, usd/pct/signedPct/intOrDash/changeClass/cards) 그대로 유지.

template/스타일은 아래로 교체(셸 제거, 패널만):

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useGlobalStore } from "../../stores/global.js";
import { formatCompact, formatNumber } from "../../utils/format.js";

const REFRESH_INTERVAL_MS = 60_000;

const store = useGlobalStore();
let pollTimer: number | undefined;

onMounted(() => {
  void store.load();
  pollTimer = window.setInterval(() => {
    if (store.loading) return;
    void store.load();
  }, REFRESH_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer);
});

const current = computed(() => store.current);
const hasData = computed(() => typeof current.value?.totalMarketCapUsd === "number");

function usd(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return `$${formatCompact(value)}`;
}
function pct(value: number | null | undefined, digits = 1): string {
  if (typeof value !== "number") return "-";
  return `${value.toFixed(digits)}%`;
}
function signedPct(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
function intOrDash(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  return formatNumber(value);
}

const changeClass = computed(() => {
  const v = current.value?.marketCapChangePct24h;
  if (typeof v !== "number" || v === 0) return "flat";
  return v > 0 ? "up" : "down";
});

const cards = computed(() => {
  const c = current.value;
  if (!c) return [];
  return [
    { key: "volume", label: "24h 거래량", value: usd(c.totalVolumeUsd) },
    { key: "btc", label: "BTC 도미넌스", value: pct(c.btcDominance) },
    { key: "eth", label: "ETH 도미넌스", value: pct(c.ethDominance) },
    { key: "coins", label: "활성 암호화폐", value: intOrDash(c.activeCryptocurrencies) },
    { key: "markets", label: "거래소 수", value: intOrDash(c.markets) },
  ];
});
</script>

<template>
  <div class="global-view">
    <p v-if="store.loading && !current" class="insights-state">불러오는 중…</p>
    <p v-else-if="store.error" class="insights-state insights-state--error">{{ store.error }}</p>
    <p v-else-if="current?.degraded" class="insights-state insights-state--error">
      글로벌 시장 데이터를 일시적으로 가져올 수 없습니다. (사유: {{ current.degradedReason }})
    </p>

    <template v-if="hasData">
      <article class="panel panel-hero">
        <div class="panel-head">
          <h2>총 시가총액</h2>
          <p class="panel-sub">Total Crypto Market Cap (USD)</p>
        </div>
        <div class="hero-readout">
          <strong>{{ usd(current?.totalMarketCapUsd) }}</strong>
          <span class="hero-change" :class="changeClass">{{ signedPct(current?.marketCapChangePct24h) }} (24h)</span>
        </div>
      </article>

      <section class="grid">
        <article v-for="card in cards" :key="card.key" class="panel panel-stat">
          <span class="stat-label">{{ card.label }}</span>
          <span class="stat-value">{{ card.value }}</span>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.global-view {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
}
.panel {
  @include exchange-panel;
  padding: clamp(12px, 1.8vh, 18px);
}
.panel-head { @include panel-head; }
.panel-head h2 {
  @include panel-title(18px);
  font-size: clamp(15px, 1.8vw, 18px);
}
.panel-sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.2vw, 13px);
  text-align: right;
}
.hero-readout {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: clamp(6px, 1.4vh, 12px);
}
.hero-readout strong {
  font-size: clamp(34px, 6vw, 56px);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.hero-change {
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 800;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: clamp(10px, 1.4vw, 14px);
}
.panel-stat { display: flex; flex-direction: column; gap: 8px; }
.stat-label {
  color: var(--text-muted);
  font-size: clamp(12px, 1.2vw, 13px);
  font-weight: 700;
}
.stat-value {
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.up { color: var(--c-up); }
.down { color: var(--c-down); }
.flat { color: var(--c-flat); }
.insights-state {
  margin: clamp(16px, 4vh, 40px) 0;
  text-align: center;
  color: var(--text-muted);
}
.insights-state--error { color: var(--alert-text); }
</style>
```

- [ ] **Step 2: GlobalPage를 thin wrapper로** — `web/src/features/global/GlobalPage.vue` 전체 교체

```vue
<script setup lang="ts">
import AppNav from "../../components/AppNav.vue";
import GlobalView from "./GlobalView.vue";
</script>

<template>
  <main class="global-page">
    <AppNav class="global-nav" />
    <section class="global-layout">
      <GlobalView />
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) { margin: 0; }
.global-page {
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
.global-nav {
  flex: 0 0 auto;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto clamp(8px, 1.2vh, 12px);
}
.global-layout {
  flex: 1;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  padding: 14px;
}
</style>
```

- [ ] **Step 3: SentimentView 생성** — `web/src/features/sentiment/SentimentView.vue`

`SentimentPage.vue`를 복사한 뒤 다음을 적용:
- import 제거: `AppNav`, `NewsAlertsPopover`, `useNewsStore`, `NEWS_HOT_ALERT_POLL_INTERVAL_MS`.
- 스크립트에서 핫알림 관련 전부 제거: `newsStore`, `hotAlertPollTimer`, `setHotAlertEnabled`, `requestHotAlertPermission`, `markHotAlertsSeen`, `initializeHotAlertState`, 그리고 `onMounted`/`onBeforeUnmount` 내 핫알림 라인.
- `onMounted`는 다음으로: `onMounted(() => { void store.load(days.value); });` (trendResizeObserver는 `watch(trendBodyRef, ...)`가 설정하므로 onMounted에서 추가 작업 없음).
- `onBeforeUnmount`는 다음으로: `onBeforeUnmount(() => { trendResizeObserver?.disconnect(); });`
- 나머지 스크립트(store, days, dayOptions, trendBodyRef/chartHeight/watch, current/hasData/history, CLASSIFICATION_KO/LABEL_KO/labelOf, classificationKo/labelKo, readCssToken, snapshots/nowValue/deltaVsNow/labelClass, GAUGE/pointOnArc/arcPath/gaugeZones/needle, trendOptions) 전부 유지.
- template: 최상위 `<main class="sentiment-page">` + `<AppNav class="sentiment-nav">…</AppNav>` 블록 제거. 루트를 `<div class="sentiment-view">`로 바꾸고, 그 안에 기존 `<section class="sentiment-layout">…</section>`의 **내부 내용**(상태 문단들 + `<section class="grid">` + `<article class="panel panel-trend">`)을 그대로 둔다.
- style: `:global(body)`, `.sentiment-page`, `.sentiment-nav`, `.sentiment-layout` 규칙 제거. 대신 `.sentiment-view { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: clamp(8px, 1.4vh, 14px); }` 추가. 그 외 모든 스타일(.grid/.panel/gauge/history/trend 등) 유지. `.sentiment-state`는 `.insights-state`로 클래스명을 바꿀 필요 없음 — 기존 `.sentiment-state` 스타일과 마크업을 그대로 유지(자체 scoped).

- [ ] **Step 4: SentimentPage는 이 태스크에서 변경하지 않는다 (의도적)**

`SentimentView`는 신규 생성하지만, `SentimentPage.vue`는 **원본 그대로 둔다**(인라인 핫알림 로직 포함). 이유: SentimentPage를 wrapper로 바꾸면 `useHotAlerts`(Task 3 생성)에 의존하게 되어 순서가 꼬인다. Task 2 시점에는 `/sentiment` 라우트가 기존 SentimentPage로 계속 동작하면 충분하고, SentimentPage 원본과 SentimentView가 잠시 공존(콘텐츠 중복)하지만 이 중복은 **Task 3 cutover에서 SentimentPage 삭제로 해소**된다. GlobalPage/KimchiPage만 wrapper로 전환한다(이들은 컴포저블 의존이 없음).

- [ ] **Step 5: KimchiView 생성 (스타일 명충)** — `web/src/features/kimchi/KimchiView.vue`

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useKimchiStore } from "../../stores/kimchi.js";
import { useFxStore } from "../../stores/fx.js";
import { useMarketSocket } from "../../composables/useMarketSocket.js";
import { useBinanceSocket } from "../../composables/useBinanceSocket.js";
import KimchiTable from "./KimchiTable.vue";

const FX_POLL_MS = 30 * 60 * 1000;

const kimchi = useKimchiStore();
const fx = useFxStore();
const { loading, error, degraded } = storeToRefs(kimchi);
const rows = computed(() => kimchi.rows);

const upbit = useMarketSocket();
const binance = useBinanceSocket();

let fxTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([kimchi.loadUniverse(), fx.load()]);
  if (kimchi.upbitMarkets.length > 0) {
    upbit.subscribe("ticker", kimchi.upbitMarkets);
    binance.subscribe(kimchi.binanceSymbols);
  }
  fxTimer = setInterval(() => { void fx.load(); }, FX_POLL_MS);
});

onUnmounted(() => {
  if (fxTimer) clearInterval(fxTimer);
});
</script>

<template>
  <div class="kimchi-view">
    <article class="panel">
      <div class="panel-head">
        <h2>김치 프리미엄</h2>
        <p class="panel-sub">업비트(KRW) vs 바이낸스(USDT) 실시간 가격 괴리율</p>
      </div>

      <p v-if="fx.degraded || degraded" class="kimchi-view__banner">
        일부 데이터를 일시적으로 불러오지 못했습니다. 표시된 값이 지연될 수 있습니다.
      </p>

      <p v-if="loading && rows.length === 0" class="insights-state">불러오는 중…</p>
      <p v-else-if="error" class="insights-state insights-state--error">{{ error }}</p>
      <KimchiTable v-else :rows="rows" />

      <footer class="kimchi-view__footer">
        USDT ≈ USD 근사로 환산했습니다. ·
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
          Rates By Exchange Rate API
        </a>
      </footer>
    </article>
  </div>
</template>

<style scoped lang="scss">
.kimchi-view {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
}
.panel { @include exchange-panel; padding: clamp(12px, 1.8vh, 18px); }
.panel-head { @include panel-head; }
.panel-head h2 {
  @include panel-title(18px);
  font-size: clamp(15px, 1.8vw, 18px);
}
.panel-sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.2vw, 13px);
  text-align: right;
}
.kimchi-view__banner {
  border: 1px solid var(--alert-border);
  background: var(--alert-bg);
  color: var(--alert-text);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  margin: 0 0 12px;
}
.kimchi-view__footer {
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 12px;
}
.kimchi-view__footer a { color: inherit; text-decoration: underline; }
.insights-state {
  margin: clamp(16px, 4vh, 40px) 0;
  text-align: center;
  color: var(--text-muted);
}
.insights-state--error { color: var(--alert-text); }
</style>
```

- [ ] **Step 6: KimchiPage를 thin wrapper로** — `web/src/features/kimchi/KimchiPage.vue` 전체 교체

```vue
<script setup lang="ts">
import AppNav from "../../components/AppNav.vue";
import KimchiView from "./KimchiView.vue";
</script>

<template>
  <main class="kimchi-page">
    <AppNav class="kimchi-nav" />
    <section class="kimchi-layout">
      <KimchiView />
    </section>
  </main>
</template>

<style scoped lang="scss">
:global(body) { margin: 0; }
.kimchi-page {
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
.kimchi-nav {
  flex: 0 0 auto;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto clamp(8px, 1.2vh, 12px);
}
.kimchi-layout {
  flex: 1;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  padding: 14px;
}
</style>
```

- [ ] **Step 7: global-page 테스트를 GlobalView로 변경** — `web/test/global-page.test.ts`

import 라인을 변경: `import GlobalPage from "../src/features/global/GlobalPage.vue";` → `import GlobalView from "../src/features/global/GlobalView.vue";`
그리고 두 `mount(GlobalPage, ...)` 호출을 `mount(GlobalView, { global: { plugins: [router] } })`로 변경 (assertions 동일). 파일명/describe 라벨은 그대로 두어도 무방.

- [ ] **Step 8: 테스트 + 빌드 검증**

Run: `cd web && npx vitest run test/global-page.test.ts test/kimchi-table.test.ts test/insights-tabs.test.ts`
Expected: 모두 PASS (global 2, kimchi-table 3, insights-tabs 2).
Run: `cd web && npx vue-tsc --noEmit && npm run build`
Expected: 타입/빌드 성공. (참고: 기존 `news-page.test.ts` 사전 실패는 무관.)

- [ ] **Step 9: 커밋**

```bash
git add web/src/features/global/ web/src/features/sentiment/SentimentView.vue web/src/features/kimchi/ web/test/global-page.test.ts
git commit -m "refactor(insights): extract Global/Sentiment/Kimchi content into views, restyle KimchiView"
```

---

### Task 3: 허브 통합 — InsightsPage + useHotAlerts + 라우터 cutover + AppNav

**Files:**
- Create: `web/src/composables/useHotAlerts.ts`
- Create: `web/src/features/insights/InsightsPage.vue`
- Modify: `web/src/router/index.ts`
- Modify: `web/src/components/AppNav.vue`
- Delete: `web/src/features/global/GlobalPage.vue`, `web/src/features/sentiment/SentimentPage.vue`, `web/src/features/kimchi/KimchiPage.vue`
- Test: `web/test/insights-page.test.ts`

**Interfaces:**
- Consumes: `InsightsTabs` + `InsightTab` (Task 1), `GlobalView`/`SentimentView`/`KimchiView` (Task 2), `AppNav`, `NewsAlertsPopover`, `useNewsStore`, `NEWS_HOT_ALERT_POLL_INTERVAL_MS`, vue-router `useRoute`.
- Produces:
  - `useHotAlerts()` → `{ newsStore, setHotAlertEnabled(enabled: boolean), requestHotAlertPermission(), markHotAlertsSeen() }`, 내부에서 onMounted 초기화 + 폴링, onBeforeUnmount 정리.
  - `InsightsPage` (라우트 부모, 셸).
  - 라우트: `/insights`(부모) + children `insights-global`/`insights-sentiment`/`insights-kimchi`; `/insights` 진입 시 `/insights/global` redirect; 구 경로 3개 redirect.

- [ ] **Step 1: useHotAlerts 컴포저블 생성** — `web/src/composables/useHotAlerts.ts`

(현재 SentimentPage 인라인 로직을 그대로 옮긴다.)

```ts
import { onBeforeUnmount, onMounted } from "vue";
import { useNewsStore } from "../stores/news.js";
import { NEWS_HOT_ALERT_POLL_INTERVAL_MS } from "../constants/news.js";

export function useHotAlerts() {
  const newsStore = useNewsStore();
  let pollTimer: number | undefined;

  function setHotAlertEnabled(enabled: boolean) {
    void newsStore.setHotAlertEnabled(enabled);
  }
  function requestHotAlertPermission() {
    void newsStore.requestNotificationPermission();
  }
  function markHotAlertsSeen() {
    newsStore.markHotAlertsSeen();
  }

  async function initializeHotAlertState() {
    await newsStore.loadHotAlertState();
    if (newsStore.hotAlertHasUserPreference) {
      if (!newsStore.hotAlertEnabled) return;
      if (newsStore.hotAlertPermission !== "granted") {
        newsStore.hotAlertEnabled = false;
        newsStore.persistHotAlertState();
      }
      return;
    }
    if (newsStore.hotAlertPermission === "default") {
      requestHotAlertPermission();
      return;
    }
    if (newsStore.hotAlertPermission === "granted") {
      setHotAlertEnabled(true);
    }
  }

  onMounted(async () => {
    await initializeHotAlertState();
    await newsStore.refreshHotAlertSnapshot();
    pollTimer = window.setInterval(() => {
      if (newsStore.loading) return;
      void newsStore.refreshHotAlertSnapshot();
    }, NEWS_HOT_ALERT_POLL_INTERVAL_MS);
  });

  onBeforeUnmount(() => {
    if (pollTimer) window.clearInterval(pollTimer);
  });

  return { newsStore, setHotAlertEnabled, requestHotAlertPermission, markHotAlertsSeen };
}
```

- [ ] **Step 2: InsightsPage 생성** — `web/src/features/insights/InsightsPage.vue`

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppNav from "../../components/AppNav.vue";
import NewsAlertsPopover from "../news/NewsAlertsPopover.vue";
import InsightsTabs, { type InsightTab } from "./InsightsTabs.vue";
import { useGlobalStore } from "../../stores/global.js";
import { useKimchiStore } from "../../stores/kimchi.js";
import { useHotAlerts } from "../../composables/useHotAlerts.js";

const route = useRoute();
const globalStore = useGlobalStore();
const kimchiStore = useKimchiStore();
const { newsStore, setHotAlertEnabled, requestHotAlertPermission, markHotAlertsSeen } = useHotAlerts();

const tabs = computed<InsightTab[]>(() => [
  { key: "global", label: "글로벌 시총", to: "/insights/global", degraded: globalStore.current?.degraded === true },
  { key: "sentiment", label: "시장심리", to: "/insights/sentiment" },
  { key: "kimchi", label: "김치프리미엄", to: "/insights/kimchi", degraded: kimchiStore.degraded === true },
]);

const activeKey = computed(() => {
  const name = route.name;
  if (name === "insights-sentiment") return "sentiment";
  if (name === "insights-kimchi") return "kimchi";
  return "global";
});
</script>

<template>
  <main class="insights-page">
    <AppNav class="insights-nav">
      <template #actions>
        <NewsAlertsPopover
          :hot-alert-enabled="newsStore.hotAlertEnabled"
          :hot-alert-permission="newsStore.hotAlertPermission"
          :hot-alert-history="newsStore.hotAlertHistory"
          :hot-alert-unseen-count="newsStore.hotAlertUnseenCount"
          @toggle-hot-alert="setHotAlertEnabled"
          @request-hot-alert-permission="requestHotAlertPermission"
          @mark-seen="markHotAlertsSeen"
        />
      </template>
    </AppNav>

    <section class="insights-shell">
      <header class="insights-head">
        <h1>시장 동향</h1>
        <p class="insights-head__sub">암호화폐 시장 전체를 한눈에 — 시총·심리·김치프리미엄</p>
      </header>

      <InsightsTabs :tabs="tabs" :active-key="activeKey" />

      <div class="insights-body">
        <router-view />
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
  flex: 1;
  min-height: 0;
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
  padding: 14px;
}
.insights-head { display: flex; flex-direction: column; gap: 2px; }
.insights-head h1 {
  @include panel-title(22px);
  font-size: clamp(20px, 3vw, 26px);
}
.insights-head__sub {
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(12px, 1.3vw, 14px);
}
.insights-body { flex: 1; min-height: 0; padding-top: 4px; }
</style>
```

- [ ] **Step 3: 라우터 cutover** — `web/src/router/index.ts` 전체 교체

```ts
import { createRouter, createWebHistory } from "vue-router";
import LandingPage from "../features/landing/LandingPage.vue";
import ExchangePage from "../features/exchange/ExchangePage.vue";
import NewsPage from "../features/news/NewsPage.vue";
import InsightsPage from "../features/insights/InsightsPage.vue";
import GlobalView from "../features/global/GlobalView.vue";
import SentimentView from "../features/sentiment/SentimentView.vue";
import KimchiView from "../features/kimchi/KimchiView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingPage },
    { path: "/exchange", name: "exchange", component: ExchangePage },
    { path: "/news", name: "news", component: NewsPage },
    {
      path: "/insights",
      component: InsightsPage,
      children: [
        { path: "", redirect: { name: "insights-global" } },
        { path: "global", name: "insights-global", component: GlobalView },
        { path: "sentiment", name: "insights-sentiment", component: SentimentView },
        { path: "kimchi", name: "insights-kimchi", component: KimchiView },
      ],
    },
    { path: "/global", redirect: "/insights/global" },
    { path: "/sentiment", redirect: "/insights/sentiment" },
    { path: "/kimchi", redirect: "/insights/kimchi" },
  ],
});
```

- [ ] **Step 4: AppNav 링크 통합** — `web/src/components/AppNav.vue`

`<template>`의 링크 묶음에서 시장심리·김치프리미엄·글로벌 시총 3개 `<router-link>`를 제거하고, `거래소` 링크 다음에 단일 링크를 둔다:

```html
        <router-link to="/exchange" class="app-nav__link">거래소</router-link>
        <router-link to="/insights" class="app-nav__link">시장 동향</router-link>
        <router-link to="/news" class="app-nav__link">뉴스</router-link>
```

그리고 `<style>`에서 active 하이라이트가 하위 경로(`/insights/global` 등)에서도 적용되도록, 기존 셀렉터 그룹에 `.router-link-active`를 추가한다:

```scss
.app-nav__link:hover,
.app-nav__link:focus-visible,
.app-nav__link.router-link-active,
.app-nav__link[aria-current="page"] {
  color: var(--brand-lime);
  border-color: var(--panel-border-hover);
  background: var(--panel-bg-strong);
  outline: none;
}
```

(주의: `app-nav__brand`는 `/` 정확 매칭만 하므로 brand가 항상 active처럼 보이지 않도록 brand에는 `.router-link-active` 규칙이 적용되지 않게 위 셀렉터는 `.app-nav__link`에만 둔다. brand는 별도 클래스이므로 영향 없음.)

- [ ] **Step 5: 구 페이지 wrapper 삭제**

```bash
cd /c/Users/SR83/test/CoinBurrow
rm web/src/features/global/GlobalPage.vue web/src/features/sentiment/SentimentPage.vue web/src/features/kimchi/KimchiPage.vue
```

(만약 Task 2에서 SentimentPage 원본을 유지하는 경로를 택했다면, 이 단계에서 동일하게 삭제된다. 삭제 후 `router/index.ts`에 이들 import가 남아있지 않은지 Step 3에서 이미 제거됨을 확인.)

- [ ] **Step 6: 통합 테스트 작성** — `web/test/insights-page.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import InsightsPage from "../src/features/insights/InsightsPage.vue";
import GlobalView from "../src/features/global/GlobalView.vue";
import SentimentView from "../src/features/sentiment/SentimentView.vue";
import KimchiView from "../src/features/kimchi/KimchiView.vue";

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: "/insights",
        component: InsightsPage,
        children: [
          { path: "", redirect: { name: "insights-global" } },
          { path: "global", name: "insights-global", component: GlobalView },
          { path: "sentiment", name: "insights-sentiment", component: SentimentView },
          { path: "kimchi", name: "insights-kimchi", component: KimchiView },
        ],
      },
      { path: "/global", redirect: "/insights/global" },
      { path: "/", component: { template: "<div/>" } },
    ],
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      provider: "coingecko",
      totalMarketCapUsd: 2_410_000_000_000,
      totalVolumeUsd: 98_300_000_000,
      marketCapChangePct24h: -1.23,
      btcDominance: 54.2,
      ethDominance: 17.1,
      activeCryptocurrencies: 13567,
      markets: 1089,
      fetchedAt: 1,
      cacheTtlMs: 60000,
      stale: false,
    }),
  })) as unknown as typeof fetch);
});
afterEach(() => vi.restoreAllMocks());

describe("InsightsPage hub", () => {
  it("shows the hub header, three tabs, and the global view by default", async () => {
    const router = makeRouter();
    router.push("/insights/global");
    await router.isReady();

    const wrapper = mount(InsightsPage, {
      global: {
        plugins: [router],
        stubs: { SentimentView: true, KimchiView: true },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("시장 동향");
    const tabEls = wrapper.findAll('[role="tab"]');
    expect(tabEls).toHaveLength(3);
    expect(tabEls[0].text()).toContain("글로벌 시총");
    expect(wrapper.text()).toContain("총 시가총액");
  });

  it("redirects legacy /global to /insights/global", async () => {
    const router = makeRouter();
    router.push("/global");
    await router.isReady();
    expect(router.currentRoute.value.fullPath).toBe("/insights/global");
  });
});
```

- [ ] **Step 7: 테스트 실행**

Run: `cd web && npx vitest run test/insights-page.test.ts test/insights-tabs.test.ts test/global-page.test.ts test/kimchi-table.test.ts`
Expected: insights-page 2, insights-tabs 2, global-page 2, kimchi-table 3 — 모두 PASS.

- [ ] **Step 8: 타입 체크 + 전체 테스트 + 빌드**

Run: `cd web && npx vue-tsc --noEmit && npm test && npm run build`
Expected: 타입 OK, 빌드 성공. `news-page.test.ts` 사전 실패 1건은 baseline(무관). 그 외 신규 실패 0.

- [ ] **Step 9: 커밋**

```bash
git add web/src/composables/useHotAlerts.ts web/src/features/insights/InsightsPage.vue web/src/router/index.ts web/src/components/AppNav.vue web/test/insights-page.test.ts
git rm web/src/features/global/GlobalPage.vue web/src/features/sentiment/SentimentPage.vue web/src/features/kimchi/KimchiPage.vue
git commit -m "feat(insights): merge sentiment/kimchi/global into /insights tab hub with shared shell"
```

---

### Task 4: README 네비/라우트 문서 동기화

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: (없음) Produces: (없음)

- [ ] **Step 1: README 갱신** — `README.md`

`## 구조` 또는 적절한 위치에 SPA 라우트 설명이 있으면 시장 동향 허브를 반영한다. 명시적 라우트 목록이 없다면 `## REST 엔드포인트` 섹션 위에 다음 절을 추가:

```markdown
## 웹 라우트

- `/` 랜딩
- `/exchange` 거래소
- `/insights` 시장 동향 허브 (탭: 글로벌 시총 / 시장심리 / 김치프리미엄)
  - 기존 `/global`, `/sentiment`, `/kimchi`는 `/insights/*`로 redirect
- `/news` 뉴스
```

- [ ] **Step 2: 커밋**

```bash
git add README.md
git commit -m "docs: document /insights market-insights hub routes"
```

---

## Self-Review

**1. Spec coverage:**
- 단일 메뉴로 머지(탭 허브) → Task 3 (InsightsPage + 라우터 + AppNav 단일 링크) ✓
- 중첩 라우트·딥링크·구경로 redirect → Task 3 router ✓
- 콘텐츠 뷰 추출 → Task 2 (Global/Sentiment/Kimchi View) ✓
- KimchiView 스타일 명충 → Task 2 Step 5 ✓
- 접근성 탭바(tablist/aria/키보드/reduced-motion/색외신호) → Task 1 ✓
- 핫알림 로직 컴포저블 추출(vue-best-practices) → Task 3 useHotAlerts ✓
- 메뉴명 "시장 동향" / 기본 탭 글로벌 → Task 3 (AppNav, redirect, activeKey) ✓
- 문서 동기화 → Task 4 ✓

**2. Placeholder scan:** "TBD"/"적절히" 없음. 신규 소형 파일은 전체 코드 기재; 대형 추출(SentimentView)은 keep/strip 정밀 지시 + 의존 순서 주석. ✓

**3. Type consistency:** `InsightTab{key,label,to,degraded?}` (Task1) ↔ InsightsPage tabs(Task3) 일치. `useHotAlerts()` 반환 `{newsStore,setHotAlertEnabled,requestHotAlertPermission,markHotAlertsSeen}` ↔ InsightsPage 사용 일치. 라우트명 `insights-global/-sentiment/-kimchi` ↔ activeKey 매핑·테스트 일치. `.insights-state`/`.insights-state--error` 클래스는 각 뷰 scoped 스타일에서 자체 정의(공유 누수 없음). ✓

**알려진 baseline (무관, out of scope):** `web/test/news-page.test.ts` 사전 실패 1건, `server/test/routes.test.ts` ~20건.
